/**
 * License Validation API Endpoint
 *
 * POST /api/v2/licenses/validate
 *
 * Validates whether a license is currently valid and properly activated
 * on the requesting domain. This is the core "gatekeeper" for premium features.
 *
 * Checks:
 * - License exists and matches product
 * - License is not revoked or expired
 * - License is activated on the requesting domain
 * - Automatically marks expired licenses
 */

import { NextRequest } from "next/server";
import {
  successResponse,
  errorResponse,
  parseRequestBody,
  findLicenseByKeyAndProduct,
  findLicenseByKey,
  getActiveActivation,
  calculateDaysRemaining,
  isLicenseExpired,
  markLicenseAsExpired,
  logApiRequest,
  logApiError,
} from "@/lib/api/v2/utils";
import { validateRequestSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  recordFailedAttempt,
} from "@/lib/api/v2/rate-limit";
import type { ValidateResponseData } from "@/lib/api/v2/types";

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/licenses/validate";

  try {
    // Check rate limit
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIp, "general");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Parse and validate request body
    const parseResult = await parseRequestBody(request, validateRequestSchema);

    if (!parseResult.success) {
      return parseResult.error;
    }

    const { license_key, product_slug, domain } = parseResult.data;

    logApiRequest(endpoint, "POST", { license_key, product_slug, domain });

    // Find license and product
    const result = await findLicenseByKeyAndProduct(license_key, product_slug);

    if (!result) {
      // Record failed attempt for brute force protection
      await recordFailedAttempt(license_key);

      // Check if license exists but product doesn't match
      const licenseOnly = await findLicenseByKey(license_key);

      if (licenseOnly) {
        return errorResponse(
          "PRODUCT_NOT_FOUND",
          "License does not belong to the specified product",
          404
        );
      }

      return errorResponse("LICENSE_NOT_FOUND", "License key not found", 404);
    }

    const { license: licenseData, product: productData } = result;

    // Check if product is active
    if (!productData.active) {
      return errorResponse("PRODUCT_INACTIVE", "Product is not active", 403);
    }

    // Check for revoked status
    if (licenseData.status === "revoked") {
      return successResponse<ValidateResponseData>(
        {
          valid: false,
          license_key: licenseData.licenseKey,
          domain: domain,
          status: "revoked",
          activated_at: licenseData.activatedAt?.toISOString() || null,
          expires_at: licenseData.expiresAt?.toISOString() || null,
          days_remaining: null,
          product: {
            name: productData.name,
            slug: productData.slug,
            type: productData.type,
          },
        },
        "License has been revoked"
      );
    }

    // Check for expiration and auto-update if needed
    let currentStatus = licenseData.status;
    if (licenseData.expiresAt && isLicenseExpired(licenseData.expiresAt)) {
      if (currentStatus !== "expired") {
        await markLicenseAsExpired(licenseData.id);
        currentStatus = "expired";
      }

      return successResponse<ValidateResponseData>(
        {
          valid: false,
          license_key: licenseData.licenseKey,
          domain: domain,
          status: "expired",
          activated_at: licenseData.activatedAt?.toISOString() || null,
          expires_at: licenseData.expiresAt?.toISOString() || null,
          days_remaining: 0,
          product: {
            name: productData.name,
            slug: productData.slug,
            type: productData.type,
          },
        },
        "License has expired"
      );
    }

    // Check for active activation
    const activation = await getActiveActivation(licenseData.id);

    if (!activation) {
      return errorResponse(
        "NOT_ACTIVATED",
        "License has not been activated on any domain",
        403
      );
    }

    // Check if the domain matches
    if (activation.domain !== domain) {
      return errorResponse(
        "DOMAIN_MISMATCH",
        `License is activated on a different domain: ${activation.domain}`,
        403
      );
    }

    // All checks passed - license is valid!
    return successResponse<ValidateResponseData>(
      {
        valid: true,
        license_key: licenseData.licenseKey,
        domain: domain,
        status: currentStatus,
        activated_at: licenseData.activatedAt?.toISOString() || null,
        expires_at: licenseData.expiresAt?.toISOString() || null,
        days_remaining: calculateDaysRemaining(licenseData.expiresAt),
        product: {
          name: productData.name,
          slug: productData.slug,
          type: productData.type,
        },
      },
      "License is valid"
    );
  } catch (error) {
    logApiError(endpoint, error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
