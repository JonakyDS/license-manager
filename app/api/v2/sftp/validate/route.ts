/**
 * SFTP Credential Validation API
 *
 * Validates SFTP credentials by attempting a connection to the server.
 * Requires a valid license key in the X-License-Key header.
 *
 * Security Features:
 * - License key authentication (required)
 * - Rate limiting (prevents brute force attacks)
 * - Input validation with Zod
 * - Connection timeout (prevents hanging)
 * - Secure error handling (no sensitive data leakage)
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import SftpClient from "ssh2-sftp-client";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
} from "@/lib/api/v2/rate-limit";
import { findLicenseByKey, isLicenseExpired } from "@/lib/api/v2/utils";

// ============================================================================
// Constants
// ============================================================================

const CONNECTION_TIMEOUT_MS = 10000; // 10 seconds
const MAX_HOSTNAME_LENGTH = 255;
const MAX_USERNAME_LENGTH = 128;
const MAX_PASSWORD_LENGTH = 256;

// ============================================================================
// Validation Schema
// ============================================================================

const sftpCredentialsSchema = z.object({
  hostname: z
    .string()
    .min(1, "Hostname is required")
    .max(
      MAX_HOSTNAME_LENGTH,
      `Hostname must be at most ${MAX_HOSTNAME_LENGTH} characters`
    )
    .refine(
      (val) => {
        // Only allow subdomains of nalda.com (e.g., sftp.nalda.com, server1.nalda.com)
        const naldaSubdomainRegex =
          /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.nalda\.com$/i;
        return naldaSubdomainRegex.test(val);
      },
      {
        message:
          "Hostname must be a subdomain of nalda.com (e.g., sftp.nalda.com)",
      }
    ),
  port: z
    .number()
    .int("Port must be an integer")
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535")
    .optional()
    .default(22),
  username: z
    .string()
    .min(1, "Username is required")
    .max(
      MAX_USERNAME_LENGTH,
      `Username must be at most ${MAX_USERNAME_LENGTH} characters`
    )
    .refine((val) => !/[\x00-\x1f\x7f]/.test(val), {
      message: "Username contains invalid characters",
    }),
  password: z
    .string()
    .min(1, "Password is required")
    .max(
      MAX_PASSWORD_LENGTH,
      `Password must be at most ${MAX_PASSWORD_LENGTH} characters`
    ),
});

type SftpCredentials = z.infer<typeof sftpCredentialsSchema>;

// ============================================================================
// Types
// ============================================================================

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message: string;
}

interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

interface SftpValidationResult {
  hostname: string;
  port: number;
  username: string;
  connected: boolean;
  serverInfo?: {
    currentDirectory: string;
  };
}

// ============================================================================
// Error Mapping
// ============================================================================

interface MappedError {
  code: string;
  message: string;
  status: number;
}

function mapSftpError(error: Error): MappedError {
  const errorMessage = error.message.toLowerCase();

  // Authentication errors
  if (
    errorMessage.includes("authentication failed") ||
    errorMessage.includes("all configured authentication methods failed")
  ) {
    return {
      code: "AUTH_FAILED",
      message: "Invalid username or password",
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
      message: "Hostname could not be resolved. Please check the hostname.",
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
      message: "Connection refused. Please check the hostname and port.",
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
      message: "Connection timed out. The server may be unreachable or slow.",
      status: 408,
    };
  }

  // Host unreachable
  if (errorMessage.includes("ehostunreach")) {
    return {
      code: "HOST_UNREACHABLE",
      message: "Host is unreachable. Please check your network connection.",
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
      message: "Connection was reset by the server.",
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

  // Default error
  return {
    code: "CONNECTION_ERROR",
    message: "Failed to connect to the SFTP server.",
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
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-API-Version": "2.0",
      },
    }
  );
}

function errorResponse(
  code: string,
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
    },
  });
}

// ============================================================================
// SFTP Connection Helper
// ============================================================================

async function validateSftpConnection(
  credentials: SftpCredentials
): Promise<{ success: true; cwd: string } | { success: false; error: Error }> {
  const sftp = new SftpClient();

  try {
    // Connect with timeout
    await sftp.connect({
      host: credentials.hostname,
      port: credentials.port,
      username: credentials.username,
      password: credentials.password,
      readyTimeout: CONNECTION_TIMEOUT_MS,
      retries: 0, // No retries for validation
    });

    // Verify connection by getting current directory
    const cwd = await sftp.cwd();

    // Gracefully close connection
    await sftp.end();

    return { success: true, cwd };
  } catch (error) {
    // Ensure connection is closed on error
    try {
      await sftp.end();
    } catch {
      // Ignore close errors
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(
  request: NextRequest
): Promise<
  NextResponse<ApiSuccessResponse<SftpValidationResult> | ApiErrorResponse>
> {
  try {
    // ========================================================================
    // 1. Rate Limiting
    // ========================================================================
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(`sftp:${clientIp}`, "general");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // ========================================================================
    // 2. License Key Authentication
    // ========================================================================
    const licenseKey = request.headers.get("X-License-Key");

    if (!licenseKey) {
      return errorResponse(
        "LICENSE_KEY_REQUIRED",
        "X-License-Key header is required",
        401
      );
    }

    // Validate license key format (XXXX-XXXX-XXXX-XXXX)
    const licenseKeyRegex =
      /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
    if (!licenseKeyRegex.test(licenseKey)) {
      return errorResponse(
        "INVALID_LICENSE_KEY_FORMAT",
        "Invalid license key format",
        401
      );
    }

    // Find and validate the license
    const licenseResult = await findLicenseByKey(licenseKey.toUpperCase());

    if (!licenseResult) {
      return errorResponse("LICENSE_NOT_FOUND", "Invalid license key", 401);
    }

    const { license: licenseData, product: productData } = licenseResult;

    // Check if license is revoked
    if (licenseData.status === "revoked") {
      return errorResponse("LICENSE_REVOKED", "License has been revoked", 403);
    }

    // Check if license is expired
    if (
      licenseData.status === "expired" ||
      isLicenseExpired(licenseData.expiresAt)
    ) {
      return errorResponse("LICENSE_EXPIRED", "License has expired", 403);
    }

    // Check if product is active
    if (!productData.active) {
      return errorResponse("PRODUCT_INACTIVE", "Product is not active", 403);
    }

    // ========================================================================
    // 3. Parse and Validate Request Body
    // ========================================================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "INVALID_JSON",
        "Request body must be valid JSON",
        400
      );
    }

    const validationResult = sftpCredentialsSchema.safeParse(body);

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

    const credentials = validationResult.data;

    // ========================================================================
    // 4. Validate SFTP Connection
    // ========================================================================
    const connectionResult = await validateSftpConnection(credentials);

    if (!connectionResult.success) {
      const mappedError = mapSftpError(connectionResult.error);

      // Log error for debugging (in production, use proper logging service)
      if (process.env.NODE_ENV === "development") {
        console.error("[SFTP Validation Error]", {
          hostname: credentials.hostname,
          port: credentials.port,
          username: credentials.username,
          error: connectionResult.error.message,
        });
      }

      return errorResponse(
        mappedError.code,
        mappedError.message,
        mappedError.status
      );
    }

    // ========================================================================
    // 5. Return Success Response
    // ========================================================================
    return successResponse<SftpValidationResult>(
      {
        hostname: credentials.hostname,
        port: credentials.port,
        username: credentials.username,
        connected: true,
        serverInfo: {
          currentDirectory: connectionResult.cwd,
        },
      },
      "SFTP credentials are valid"
    );
  } catch (error) {
    // Log unexpected errors
    console.error("[SFTP API Unexpected Error]", error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
