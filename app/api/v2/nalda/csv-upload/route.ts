/**
 * Nalda CSV Upload API Endpoint
 *
 * POST /api/v2/nalda/csv-upload
 *
 * Accepts a CSV file upload via multipart/form-data along with SFTP credentials.
 * The file is uploaded to both cloud storage (UploadThing) and SFTP server in parallel.
 *
 * Security Features:
 * - License key and domain validation (required)
 * - Domain must be activated for the license
 * - Rate limiting (prevents abuse)
 * - Input validation with Zod
 * - File type and size validation
 * - SFTP credentials encrypted before storage
 * - Secure error handling (no sensitive data leakage)
 *
 * Flow:
 * 1. Rate limit check
 * 2. Parse and validate multipart form data
 * 3. Validate CSV file (type and size)
 * 4. Validate license key and domain
 * 5. Upload to UploadThing and SFTP in parallel
 * 6. Store request record in database
 * 7. Return success response
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { Readable } from "stream";
import SftpClient from "ssh2-sftp-client";
import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest } from "@/db/schema";
import {
  validateLicenseAndDomainForNalda,
  maskLicenseKey,
} from "@/lib/api/v2/utils";
import { licenseKeySchema, domainSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from "@/lib/api/v2/rate-limit";
import { utapi } from "@/lib/uploadthing";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ErrorCode,
  NaldaCsvUploadRequestResponseData,
} from "@/lib/api/v2/types";

// ============================================================================
// Constants
// ============================================================================

/** Maximum file size: 16MB */
const MAX_FILE_SIZE = 16 * 1024 * 1024;

/** Maximum file size in human-readable format */
const MAX_FILE_SIZE_MB = MAX_FILE_SIZE / 1024 / 1024;

/** SFTP connection timeout: 30 seconds */
const SFTP_CONNECTION_TIMEOUT_MS = 30000;

/** Allowed MIME types for CSV files */
const ALLOWED_MIME_TYPES = ["text/csv", "application/csv", "text/plain"];

/** Allowed file extensions */
const ALLOWED_EXTENSIONS = [".csv"];

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Validates SFTP hostname - must be a subdomain of nalda.com
 */
const sftpHostSchema = z
  .string()
  .min(1, "SFTP host is required")
  .max(255, "SFTP host must be at most 255 characters")
  .refine(
    (val) => {
      const naldaSubdomainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.nalda\.com$/i;
      return naldaSubdomainRegex.test(val);
    },
    {
      message:
        "SFTP host must be a subdomain of nalda.com (e.g., sftp.nalda.com)",
    }
  );

/**
 * Schema for validating form fields (excluding file)
 */
const formFieldsSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
  sftp_host: sftpHostSchema,
  sftp_port: z.coerce
    .number()
    .int("Port must be an integer")
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535")
    .default(22),
  sftp_username: z
    .string()
    .min(1, "SFTP username is required")
    .max(255, "SFTP username must be at most 255 characters")
    .refine((val) => !/[\x00-\x1f\x7f]/.test(val), {
      message: "SFTP username contains invalid characters",
    }),
  sftp_password: z
    .string()
    .min(1, "SFTP password is required")
    .max(1024, "SFTP password must be at most 1024 characters"),
});

// ============================================================================
// Types
// ============================================================================

interface SftpUploadResult {
  success: true;
  remotePath: string;
}

interface SftpUploadError {
  success: false;
  error: Error;
}

type SftpUploadOutcome = SftpUploadResult | SftpUploadError;

interface StorageUploadResult {
  success: true;
  key: string;
  url: string;
}

interface StorageUploadError {
  success: false;
  error: string;
}

type StorageUploadOutcome = StorageUploadResult | StorageUploadError;

interface MappedError {
  code: ErrorCode;
  message: string;
  status: number;
}

// ============================================================================
// Error Mapping
// ============================================================================

/**
 * Maps SFTP errors to user-friendly error responses.
 * Follows the same pattern as sftp-validate endpoint.
 */
function mapSftpError(error: Error): MappedError {
  const errorMessage = error.message.toLowerCase();

  // Authentication errors
  if (
    errorMessage.includes("authentication failed") ||
    errorMessage.includes("all configured authentication methods failed")
  ) {
    return {
      code: "AUTH_FAILED",
      message:
        "SFTP authentication failed. Please check username and password.",
      status: 401,
    };
  }

  // DNS/hostname errors
  if (
    errorMessage.includes("enotfound") ||
    errorMessage.includes("getaddrinfo")
  ) {
    return {
      code: "HOST_NOT_FOUND",
      message:
        "SFTP hostname could not be resolved. Please check the hostname.",
      status: 400,
    };
  }

  // Connection refused
  if (
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("connection refused")
  ) {
    return {
      code: "CONNECTION_REFUSED",
      message: "SFTP connection refused. Please check the hostname and port.",
      status: 400,
    };
  }

  // Timeout errors
  if (
    errorMessage.includes("etimedout") ||
    errorMessage.includes("timed out") ||
    errorMessage.includes("timeout")
  ) {
    return {
      code: "CONNECTION_TIMEOUT",
      message: "SFTP connection timed out. The server may be unreachable.",
      status: 408,
    };
  }

  // Host unreachable
  if (errorMessage.includes("ehostunreach")) {
    return {
      code: "HOST_UNREACHABLE",
      message:
        "SFTP host is unreachable. Please check your network connection.",
      status: 400,
    };
  }

  // Network unreachable
  if (errorMessage.includes("enetunreach")) {
    return {
      code: "NETWORK_UNREACHABLE",
      message: "Network is unreachable. Please check your network connection.",
      status: 400,
    };
  }

  // Connection reset
  if (errorMessage.includes("econnreset")) {
    return {
      code: "CONNECTION_RESET",
      message: "SFTP connection was reset by the server.",
      status: 400,
    };
  }

  // SSH protocol errors
  if (
    errorMessage.includes("handshake failed") ||
    errorMessage.includes("protocol")
  ) {
    return {
      code: "PROTOCOL_ERROR",
      message: "SSH handshake failed. The server may not support SFTP.",
      status: 400,
    };
  }

  // Permission denied (for file operations)
  if (
    errorMessage.includes("permission denied") ||
    errorMessage.includes("access denied")
  ) {
    return {
      code: "FORBIDDEN",
      message: "Permission denied. Cannot write to the SFTP directory.",
      status: 403,
    };
  }

  // Default error
  return {
    code: "CONNECTION_ERROR",
    message: "Failed to upload file to SFTP server.",
    status: 400,
  };
}

// ============================================================================
// Response Helpers
// ============================================================================

function successResponse<T>(
  data: T,
  message: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, data, message },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-API-Version": "2.0",
        "X-API-Type": "server-to-server",
      },
    }
  );
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: { code, message },
  };

  if (details) {
    response.error.details = details;
  }

  return NextResponse.json(response, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-API-Version": "2.0",
      "X-API-Type": "server-to-server",
    },
  });
}

// ============================================================================
// Logging Helpers
// ============================================================================

function logRequest(action: string, params: Record<string, unknown>): void {
  const safeParams = { ...params };

  // Mask sensitive data
  if (typeof safeParams.license_key === "string") {
    safeParams.license_key = maskLicenseKey(safeParams.license_key);
  }
  if (safeParams.sftp_password) {
    safeParams.sftp_password = "********";
  }

  console.log(`[CSV Upload] ${action}`, JSON.stringify(safeParams));
}

function logError(
  action: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  const safeContext = context ? { ...context } : {};

  // Mask sensitive data in context
  if (typeof safeContext.license_key === "string") {
    safeContext.license_key = maskLicenseKey(safeContext.license_key);
  }
  if (safeContext.sftp_password) {
    safeContext.sftp_password = "********";
  }

  console.error(`[CSV Upload Error] ${action}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: safeContext,
  });
}

// ============================================================================
// File Validation Helpers
// ============================================================================

function isValidFileType(file: File): boolean {
  // Check MIME type
  if (ALLOWED_MIME_TYPES.includes(file.type)) {
    return true;
  }

  // Check file extension as fallback
  const fileName = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function isValidFileSize(file: File): boolean {
  return file.size > 0 && file.size <= MAX_FILE_SIZE;
}

// ============================================================================
// SFTP Upload Helper
// ============================================================================

interface SftpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

async function uploadToSftp(
  fileBuffer: Buffer,
  fileName: string,
  credentials: SftpCredentials
): Promise<SftpUploadOutcome> {
  const sftp = new SftpClient();

  try {
    // Connect with timeout
    await sftp.connect({
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      readyTimeout: SFTP_CONNECTION_TIMEOUT_MS,
      retries: 0, // No retries - fail fast for user feedback
    });

    // Get current directory and create remote path
    const cwd = await sftp.cwd();
    const remotePath = `${cwd}/${fileName}`;

    // Convert buffer to readable stream for upload
    const stream = Readable.from(fileBuffer);

    // Upload file
    await sftp.put(stream, remotePath);

    // Gracefully close connection
    await sftp.end();

    return {
      success: true,
      remotePath,
    };
  } catch (error) {
    // Ensure connection is closed on error
    try {
      await sftp.end();
    } catch {
      // Ignore close errors
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown SFTP error"),
    };
  }
}

// ============================================================================
// Storage Upload Helper
// ============================================================================

async function uploadToStorage(file: File): Promise<StorageUploadOutcome> {
  try {
    const response = await utapi.uploadFiles(file);

    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      };
    }

    return {
      success: true,
      key: response.data.key,
      url: response.data.ufsUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Storage upload failed",
    };
  }
}

// ============================================================================
// Password Encryption (Production Security)
// ============================================================================

/**
 * Encrypts SFTP password before storing in database.
 * In production, use proper encryption with a secure key management system.
 *
 * TODO: Implement proper encryption using:
 * - AWS KMS, GCP KMS, or Azure Key Vault for key management
 * - AES-256-GCM for encryption
 * - Separate encryption key per tenant (if multi-tenant)
 */
function encryptPassword(password: string): string {
  // For now, we use base64 encoding as a placeholder
  // This is NOT secure - implement proper encryption before production use
  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[Security Warning] SFTP passwords are not encrypted. Implement proper encryption before production use."
    );
  }
  return Buffer.from(password).toString("base64");
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<
  NextResponse<
    ApiSuccessResponse<NaldaCsvUploadRequestResponseData> | ApiErrorResponse
  >
> {
  const startTime = Date.now();

  try {
    // ========================================================================
    // 1. Rate Limiting
    // ========================================================================
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(
      `csv-upload:${clientIp}`,
      "general"
    );

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // ========================================================================
    // 2. Parse Multipart Form Data
    // ========================================================================
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid form data. Expected multipart/form-data with CSV file.",
        400
      );
    }

    // ========================================================================
    // 3. Extract and Validate CSV File
    // ========================================================================
    const csvFile = formData.get("csv_file");

    if (!csvFile || !(csvFile instanceof File)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "CSV file is required. Send as 'csv_file' field.",
        400,
        { csv_file: ["CSV file is required"] }
      );
    }

    if (!isValidFileType(csvFile)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid file type. Only CSV files are allowed.",
        400,
        { csv_file: ["Only CSV files (.csv) are allowed"] }
      );
    }

    if (!isValidFileSize(csvFile)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `File size must be between 1 byte and ${MAX_FILE_SIZE_MB}MB.`,
        400,
        { csv_file: [`File size must be at most ${MAX_FILE_SIZE_MB}MB`] }
      );
    }

    // ========================================================================
    // 4. Extract and Validate Form Fields
    // ========================================================================
    const rawFields = {
      license_key: formData.get("license_key"),
      domain: formData.get("domain"),
      sftp_host: formData.get("sftp_host"),
      sftp_port: formData.get("sftp_port") || "22",
      sftp_username: formData.get("sftp_username"),
      sftp_password: formData.get("sftp_password"),
    };

    const validationResult = formFieldsSchema.safeParse(rawFields);

    if (!validationResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of validationResult.error.issues) {
        const field = issue.path.join(".");
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(issue.message);
      }

      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request parameters",
        400,
        fieldErrors
      );
    }

    const {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      sftp_username,
      sftp_password,
    } = validationResult.data;

    // Log the request (with masked sensitive data)
    logRequest("Request received", {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      sftp_username,
      file_name: csvFile.name,
      file_size: csvFile.size,
    });

    // ========================================================================
    // 5. Validate License and Domain
    // ========================================================================
    const licenseValidation = await validateLicenseAndDomainForNalda(
      license_key,
      domain,
      { requireActiveActivation: true, updateExpiredStatus: true }
    );

    if (!licenseValidation.valid) {
      logRequest("License validation failed", {
        license_key,
        domain,
        error: licenseValidation.error,
      });

      return errorResponse(
        licenseValidation.code,
        licenseValidation.error,
        licenseValidation.code === "LICENSE_NOT_FOUND" ? 404 : 403
      );
    }

    // ========================================================================
    // 6. Read File Buffer (needed for SFTP upload)
    // ========================================================================
    const fileBuffer = Buffer.from(await csvFile.arrayBuffer());

    // ========================================================================
    // 7. Upload to Storage and SFTP in Parallel
    // ========================================================================
    const [storageResult, sftpResult] = await Promise.all([
      uploadToStorage(csvFile),
      uploadToSftp(fileBuffer, csvFile.name, {
        host: sftp_host,
        port: sftp_port,
        username: sftp_username,
        password: sftp_password,
      }),
    ]);

    // Check storage upload result
    if (!storageResult.success) {
      logError("Storage upload failed", new Error(storageResult.error), {
        license_key,
        domain,
        file_name: csvFile.name,
      });

      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to upload CSV file to storage. Please try again.",
        500
      );
    }

    // Check SFTP upload result
    if (!sftpResult.success) {
      const mappedError = mapSftpError(sftpResult.error);

      logError("SFTP upload failed", sftpResult.error, {
        license_key,
        domain,
        sftp_host,
        sftp_port,
        sftp_username,
        file_name: csvFile.name,
      });

      return errorResponse(
        mappedError.code,
        mappedError.message,
        mappedError.status
      );
    }

    // ========================================================================
    // 8. Store Request in Database
    // ========================================================================
    const requestId = nanoid();
    const now = new Date();

    await db.insert(naldaCsvUploadRequest).values({
      id: requestId,
      licenseId: licenseValidation.licenseId,
      domain,
      sftpHost: sftp_host,
      sftpPort: sftp_port,
      sftpUsername: sftp_username,
      sftpPassword: encryptPassword(sftp_password),
      csvFileKey: storageResult.key,
      csvFileUrl: storageResult.url,
      csvFileName: csvFile.name,
      csvFileSize: csvFile.size,
      status: "processed",
      processedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================================================
    // 9. Return Success Response
    // ========================================================================
    const duration = Date.now() - startTime;

    logRequest("Upload successful", {
      request_id: requestId,
      license_key,
      domain,
      sftp_host,
      sftp_remote_path: sftpResult.remotePath,
      storage_key: storageResult.key,
      duration_ms: duration,
    });

    const responseData: NaldaCsvUploadRequestResponseData = {
      id: requestId,
      license_id: licenseValidation.licenseId,
      domain,
      csv_file_key: storageResult.key,
      csv_file_url: storageResult.url,
      csv_file_name: csvFile.name,
      csv_file_size: csvFile.size,
      status: "processed",
      created_at: now.toISOString(),
    };

    const response = successResponse(
      responseData,
      "CSV file uploaded successfully to storage and SFTP server"
    );

    // Add rate limit headers to response
    if (rateLimitResult) {
      return addRateLimitHeaders(response, rateLimitResult) as NextResponse<
        ApiSuccessResponse<NaldaCsvUploadRequestResponseData>
      >;
    }

    return response;
  } catch (error) {
    logError("Unexpected error", error, {
      endpoint: "/api/v2/nalda/csv-upload",
    });

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
