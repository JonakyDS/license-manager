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
  validateLicensePrerequisites,
  getActiveActivation,
  logApiRequest,
  logApiError,
} from "@/lib/api/v2/utils";
import { deactivateRequestSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
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

    // Validate license prerequisites (but allow expired licenses to be deactivated)
    const result = await validateLicensePrerequisites(
      license_key,
      product_slug
    );

    // For deactivation, we still proceed if the license is expired (just not revoked)
    // So we need custom handling here
    if (!result.valid) {
      // Allow deactivation for expired licenses
      if (result.error.status === 403) {
        const errorBody = await result.error.json();
        if (errorBody.error?.code !== "LICENSE_EXPIRED") {
          return result.error;
        }
        // For expired licenses, we need to fetch the data differently
        // Refetch to get the data we need
      } else {
        return result.error;
      }
    }

    // Refetch license data for expired case
    const { findLicenseByKeyAndProduct } = await import("@/lib/api/v2/utils");
    const licenseResult = await findLicenseByKeyAndProduct(
      license_key,
      product_slug
    );

    if (!licenseResult) {
      return errorResponse("LICENSE_NOT_FOUND", "License key not found", 404);
    }

    const { license: licenseData } = licenseResult;

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
        `License is not activated on ${domain}. It is currently activated on ${activation.domain}`,
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

    return successResponse<DeactivateResponseData>(
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
  } catch (error) {
    logApiError(endpoint, error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred. Please try again later.",
      500
    );
  }
}
