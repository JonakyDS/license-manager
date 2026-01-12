/**
 * SFTP Credential Validation API
 *
 * POST /api/v2/nalda/sftp-validate
 *
 * Validates SFTP credentials by attempting a connection to the server.
 * Requires a valid license key and domain in the request body.
 *
 * Security Features:
 * - License key and domain validation (required)
 * - Domain must be activated for the license
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
  addRateLimitHeaders,
} from "@/lib/api/v2/rate-limit";
import {
  validateLicenseAndDomainForNalda,
  logApiRequest,
  logApiError,
  maskLicenseKey,
} from "@/lib/api/v2/utils";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  ErrorCode,
} from "@/lib/api/v2/types";
import { domainSchema, licenseKeySchema } from "@/lib/api/v2/validation";
import { mapSftpError } from "../utils";

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

const sftpValidateRequestSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
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

// ============================================================================
// Types
// ============================================================================

interface SftpValidationResponseData {
  hostname: string;
  port: number;
  username: string;
  connected: boolean;
  serverInfo?: {
    currentDirectory: string;
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
    },
  });
}

// ============================================================================
// SFTP Connection Helper
// ============================================================================

interface SftpCredentials {
  hostname: string;
  port: number;
  username: string;
  password: string;
}

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
  const startTime = Date.now();

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
    // 2. Parse and Validate Request Body
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

    const validationResult = sftpValidateRequestSchema.safeParse(body);

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

    const { license_key, domain, hostname, port, username, password } =
      validationResult.data;

    // Log the request (with masked sensitive data)
    logApiRequest("SFTP Validate", "POST", {
      domain,
      hostname,
      port,
      username,
      license_key: maskLicenseKey(license_key),
    });

    // ========================================================================
    // 3. Validate License and Domain
    // ========================================================================
    const licenseValidation = await validateLicenseAndDomainForNalda(
      license_key,
      domain,
      { requireActiveActivation: true, updateExpiredStatus: true }
    );

    if (!licenseValidation.valid) {
      return errorResponse(
        licenseValidation.code,
        licenseValidation.error,
        licenseValidation.code === "LICENSE_NOT_FOUND" ? 404 : 403
      );
    }

    // ========================================================================
    // 4. Validate SFTP Connection
    // ========================================================================
    const connectionResult = await validateSftpConnection({
      hostname,
      port,
      username,
      password,
    });

    if (!connectionResult.success) {
      const mappedError = mapSftpError(connectionResult.error);

      logApiError("SFTP Validate", connectionResult.error, {
        hostname,
        port,
        username,
        domain,
      });

      return errorResponse(
        mappedError.code,
        mappedError.message,
        mappedError.status
      );
    }

    // ========================================================================
    // 5. Return Success Response
    // ========================================================================
    const duration = Date.now() - startTime;

    logApiRequest("SFTP Validate Success", "POST", {
      domain,
      hostname,
      duration: `${duration}ms`,
    });

    const response = successResponse<SftpValidationResult>(
      {
        hostname,
        port,
        username,
        connected: true,
        serverInfo: {
          currentDirectory: connectionResult.cwd,
        },
      },
      "SFTP credentials are valid"
    );

    // Add rate limit headers to response
    if (rateLimitResult) {
      return addRateLimitHeaders(response, rateLimitResult) as NextResponse<
        ApiSuccessResponse<SftpValidationResult>
      >;
    }

    return response;
  } catch (error) {
    logApiError(
      "SFTP Validate",
      error instanceof Error ? error : new Error("Unknown error"),
      { endpoint: "sftp-validate" }
    );

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
