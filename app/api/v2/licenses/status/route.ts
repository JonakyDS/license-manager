/**
 * License Status API Endpoint
 *
 * POST /api/v2/licenses/status
 *
 * Returns complete information about a license without requiring a domain.
 * Useful for building a "License Info" panel in plugin/theme settings.
 *
 * Shows:
 * - Customer information
 * - Current status
 * - Product details
 * - Activation details (if activated)
 * - Expiration and validity info
 * - Domain change statistics
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
  maskEmail,
  logApiRequest,
  logApiError,
} from "@/lib/api/utils";
import { statusRequestSchema } from "@/lib/api/validation";
import type { StatusResponseData } from "@/lib/api/types";

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/licenses/status";

  try {
    // Parse and validate request body
    const parseResult = await parseRequestBody(request, statusRequestSchema);

    if (!parseResult.success) {
      return parseResult.error;
    }

    const { license_key, product_slug } = parseResult.data;

    logApiRequest(endpoint, "POST", { license_key, product_slug });

    // Find license and product
    const result = await findLicenseByKeyAndProduct(license_key, product_slug);

    if (!result) {
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

    // Check for expiration and auto-update if needed
    let currentStatus = licenseData.status;
    const expired = isLicenseExpired(licenseData.expiresAt);

    if (expired && currentStatus !== "expired" && currentStatus !== "revoked") {
      await markLicenseAsExpired(licenseData.id);
      currentStatus = "expired";
    }

    // Get active activation if any
    const activation = await getActiveActivation(licenseData.id);

    // Calculate validity info
    const daysRemaining = calculateDaysRemaining(licenseData.expiresAt);

    return successResponse<StatusResponseData>(
      {
        license_key: licenseData.licenseKey,
        status: currentStatus,
        customer: {
          name: licenseData.customerName,
          email: maskEmail(licenseData.customerEmail),
        },
        product: {
          name: productData.name,
          slug: productData.slug,
          type: productData.type,
        },
        activation: {
          is_activated: activation !== null,
          domain: activation?.domain || null,
          activated_at: licenseData.activatedAt?.toISOString() || null,
        },
        validity: {
          validity_days: licenseData.validityDays,
          expires_at: licenseData.expiresAt?.toISOString() || null,
          days_remaining: daysRemaining,
          is_expired: expired,
        },
        domain_changes: {
          max_allowed: licenseData.maxDomainChanges,
          used: licenseData.domainChangesUsed,
          remaining:
            licenseData.maxDomainChanges - licenseData.domainChangesUsed,
        },
        timestamps: {
          created_at: licenseData.createdAt.toISOString(),
          updated_at: licenseData.updatedAt.toISOString(),
        },
      },
      "License status retrieved successfully"
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
