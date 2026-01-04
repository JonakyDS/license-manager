/**
 * License API Utilities
 *
 * Shared utilities for API response handling, error management, and common operations.
 *
 * IMPORTANT: This API is designed for server-to-server communication only.
 * Plugin/theme backends should call these endpoints, NOT browser clients.
 */

import { NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { db } from "@/db/drizzle";
import { license, product, licenseActivation } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import type { ApiSuccessResponse, ApiErrorResponse, ErrorCode } from "./types";

// ============================================================================
// Security Helpers
// ============================================================================

/**
 * Masks an email address for privacy.
 * Example: "john.doe@example.com" -> "j*******@e******.com"
 */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;

  const [localPart, domain] = email.split("@");
  if (!domain) return email;

  const [domainName, tld] = domain.split(".");
  if (!tld) return email;

  const maskedLocal =
    localPart.length > 1
      ? localPart[0] + "*".repeat(Math.min(localPart.length - 1, 7))
      : localPart;

  const maskedDomain =
    domainName.length > 1
      ? domainName[0] + "*".repeat(Math.min(domainName.length - 1, 6))
      : domainName;

  return `${maskedLocal}@${maskedDomain}.${tld}`;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Creates a successful API response.
 * Includes headers to prevent browser caching and indicate server-to-server usage.
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
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

/**
 * Creates an error API response.
 * Includes headers to prevent browser caching and indicate server-to-server usage.
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, string[]>
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
    },
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

/**
 * Creates a validation error response from Zod errors.
 */
export function validationErrorResponse(
  error: ZodError
): NextResponse<ApiErrorResponse> {
  const details: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  }

  return errorResponse(
    "VALIDATION_ERROR",
    "Invalid request parameters",
    400,
    details
  );
}

// ============================================================================
// Request Validation
// ============================================================================

/**
 * Parses and validates request body against a Zod schema.
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<
  { success: true; data: T } | { success: false; error: NextResponse }
> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      return {
        success: false,
        error: validationErrorResponse(result.error),
      };
    }

    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: errorResponse(
        "VALIDATION_ERROR",
        "Invalid JSON in request body",
        400
      ),
    };
  }
}

// ============================================================================
// License Helpers
// ============================================================================

/**
 * Calculates days remaining until expiration.
 * Returns null if no expiration date is set.
 */
export function calculateDaysRemaining(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Checks if a license is expired based on its expiration date.
 */
export function isLicenseExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

/**
 * Gets the current active activation for a license.
 */
export async function getActiveActivation(licenseId: string) {
  const activation = await db.query.licenseActivation.findFirst({
    where: and(
      eq(licenseActivation.licenseId, licenseId),
      eq(licenseActivation.isActive, true)
    ),
  });

  return activation || null;
}

/**
 * Finds a license by its key with product information.
 */
export async function findLicenseByKey(licenseKey: string) {
  const result = await db.query.license.findFirst({
    where: eq(license.licenseKey, licenseKey),
    with: {
      product: true,
    },
  });

  if (!result) return null;

  return {
    license: result,
    product: result.product,
  };
}

/**
 * Finds a license by key and product slug.
 */
export async function findLicenseByKeyAndProduct(
  licenseKey: string,
  productSlug: string
) {
  const result = await db.query.license.findFirst({
    where: eq(license.licenseKey, licenseKey),
    with: {
      product: true,
    },
  });

  if (!result || result.product.slug !== productSlug) return null;

  return {
    license: result,
    product: result.product,
  };
}

/**
 * Marks a license as expired in the database.
 */
export async function markLicenseAsExpired(licenseId: string): Promise<void> {
  await db
    .update(license)
    .set({ status: "expired" })
    .where(eq(license.id, licenseId));
}

/**
 * Validates license prerequisites (exists, matches product, not revoked, not expired).
 * Returns error response if invalid, null if valid.
 * Automatically marks expired licenses if needed.
 */
export async function validateLicensePrerequisites(
  licenseKey: string,
  productSlug: string
): Promise<
  | {
      valid: true;
      license: typeof license.$inferSelect;
      product: typeof product.$inferSelect;
    }
  | {
      valid: false;
      error: NextResponse<ApiErrorResponse>;
    }
> {
  // Find license and product
  const result = await findLicenseByKeyAndProduct(licenseKey, productSlug);

  if (!result) {
    // Check if license exists but product doesn't match
    const licenseOnly = await findLicenseByKey(licenseKey);

    if (licenseOnly) {
      return {
        valid: false,
        error: errorResponse(
          "PRODUCT_NOT_FOUND",
          "License does not belong to the specified product",
          404
        ),
      };
    }

    return {
      valid: false,
      error: errorResponse("LICENSE_NOT_FOUND", "License key not found", 404),
    };
  }

  const { license: licenseData, product: productData } = result;

  // Check if product is active
  if (!productData.active) {
    return {
      valid: false,
      error: errorResponse("PRODUCT_INACTIVE", "Product is not active", 403),
    };
  }

  // Check if license is revoked
  if (licenseData.status === "revoked") {
    return {
      valid: false,
      error: errorResponse("LICENSE_REVOKED", "License has been revoked", 403),
    };
  }

  // Check for expiration and auto-update if needed
  if (licenseData.expiresAt && isLicenseExpired(licenseData.expiresAt)) {
    if (licenseData.status !== "expired") {
      await markLicenseAsExpired(licenseData.id);
      licenseData.status = "expired";
    }

    return {
      valid: false,
      error: errorResponse("LICENSE_EXPIRED", "License has expired", 403),
    };
  }

  return {
    valid: true,
    license: licenseData,
    product: productData,
  };
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generates a unique ID for database records.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================================================
// Logging (for debugging/monitoring)
// ============================================================================

/**
 * Logs API request details (can be extended for production logging).
 */
export function logApiRequest(
  endpoint: string,
  method: string,
  params: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${method} ${endpoint}`, JSON.stringify(params, null, 2));
  }
}

/**
 * Logs API errors (can be extended for production error tracking).
 */
export function logApiError(
  endpoint: string,
  error: unknown,
  context?: Record<string, unknown>
): void {
  console.error(`[API Error] ${endpoint}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
  });
}
