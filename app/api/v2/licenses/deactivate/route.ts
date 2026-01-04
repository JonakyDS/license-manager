/**
 * License Deactivation API Endpoint
 *
 * POST /api/v2/licenses/deactivate
 *
 * Removes a license from its current domain. Used when:
 * - Moving site to a new server
 * - Switching domains
 * - Uninstalling the product
 *
 * Important: Deactivation does NOT count against the domain change limit.
 * This encourages proper deactivation before moving.
 */

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { licenseActivation } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  successResponse,
  errorResponse,
  parseRequestBody,
  findLicenseByKeyAndProduct,
  findLicenseByKey,
  getActiveActivation,
  logApiRequest,
  logApiError,
} from "@/lib/api/v2/utils";
import { deactivateRequestSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  recordFailedAttempt,
} from "@/lib/api/v2/rate-limit";
import type { DeactivateResponseData } from "@/lib/api/v2/types";

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/licenses/deactivate";

  try {
    // Check rate limit
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIp, "general");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Store for adding headers to response
    const rateLimit = rateLimitResult;

    // Parse and validate request body
    const parseResult = await parseRequestBody(
      request,
      deactivateRequestSchema
    );

    if (!parseResult.success) {
      return parseResult.error;
    }

    const { license_key, product_slug, domain, reason } = parseResult.data;

    logApiRequest(endpoint, "POST", {
      license_key,
      product_slug,
      domain,
      reason,
    });

    // Find license and product (allow expired licenses to be deactivated)
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

    // Check if license is revoked (revoked licenses cannot be deactivated)
    if (licenseData.status === "revoked") {
      return errorResponse("LICENSE_REVOKED", "License has been revoked", 403);
    }

    // Check for active activation on the specified domain
    const activation = await getActiveActivation(licenseData.id);

    if (!activation) {
      return errorResponse(
        "NOT_ACTIVATED",
        "License is not currently activated on any domain",
        400
      );
    }

    if (activation.domain !== domain) {
      return errorResponse(
        "DOMAIN_MISMATCH",
        "License is not activated on this domain",
        400
      );
    }

    // Deactivate the license
    const deactivatedAt = new Date();
    const deactivationReason = reason || "User requested deactivation";

    await db
      .update(licenseActivation)
      .set({
        isActive: false,
        deactivatedAt: deactivatedAt,
        deactivationReason: deactivationReason,
      })
      .where(eq(licenseActivation.id, activation.id));

    const response = successResponse<DeactivateResponseData>(
      {
        license_key: licenseData.licenseKey,
        domain: domain,
        deactivated_at: deactivatedAt.toISOString(),
        reason: deactivationReason,
        domain_changes_remaining:
          licenseData.maxDomainChanges - licenseData.domainChangesUsed,
      },
      "License deactivated successfully"
    );
    return addRateLimitHeaders(response, rateLimit);
  } catch (error) {
    logApiError(endpoint, error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
