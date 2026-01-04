/**
 * License Activation API Endpoint
 *
 * POST /api/v2/licences/activate
 *
 * Activates a license key on a specific domain. Handles:
 * - First-time activation (sets activated_at and calculates expires_at)
 * - Re-activation on same domain (idempotent, just confirms success)
 * - Domain change (if within allowed limit)
 */

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { license, licenseActivation } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  successResponse,
  errorResponse,
  parseRequestBody,
  validateLicensePrerequisites,
  getActiveActivation,
  calculateDaysRemaining,
  generateId,
  maskEmail,
  logApiRequest,
  logApiError,
} from "@/lib/api/v2/utils";
import { activateRequestSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  recordFailedAttempt,
} from "@/lib/api/v2/rate-limit";
import type { ActivateResponseData } from "@/lib/api/v2/types";

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/licences/activate";

  try {
    // Check rate limit (activation has stricter limits)
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIp, "activation");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Store for adding headers to response
    const rateLimit = rateLimitResult;

    // Parse and validate request body
    const parseResult = await parseRequestBody(request, activateRequestSchema);

    if (!parseResult.success) {
      return parseResult.error;
    }

    const { license_key, product_slug, domain } = parseResult.data;

    logApiRequest(endpoint, "POST", { license_key, product_slug, domain });

    // Validate license prerequisites
    const validation = await validateLicensePrerequisites(
      license_key,
      product_slug
    );

    if (!validation.valid) {
      // Record failed attempt for brute force protection
      await recordFailedAttempt(license_key);
      return validation.error;
    }

    const { license: licenseData, product: productData } = validation;

    // Get client IP for logging
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check for existing active activation
    const existingActivation = await getActiveActivation(licenseData.id);

    // Case 1: Already activated on the same domain (idempotent)
    if (existingActivation && existingActivation.domain === domain) {
      const response = successResponse<ActivateResponseData>(
        {
          license_key: licenseData.licenseKey,
          domain: domain,
          activated_at:
            licenseData.activatedAt?.toISOString() || new Date().toISOString(),
          expires_at: licenseData.expiresAt?.toISOString() || null,
          days_remaining: calculateDaysRemaining(licenseData.expiresAt),
          is_new_activation: false,
          domain_changes_remaining:
            licenseData.maxDomainChanges - licenseData.domainChangesUsed,
          product: {
            name: productData.name,
            slug: productData.slug,
            type: productData.type,
          },
          customer: {
            name: licenseData.customerName,
            email: maskEmail(licenseData.customerEmail),
          },
        },
        "License already activated on this domain"
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    // Case 2: Already activated on a different domain - domain change
    if (existingActivation && existingActivation.domain !== domain) {
      // Check domain change limit
      if (licenseData.domainChangesUsed >= licenseData.maxDomainChanges) {
        return errorResponse(
          "DOMAIN_CHANGE_LIMIT_EXCEEDED",
          `Maximum domain changes (${licenseData.maxDomainChanges}) reached. Please contact support.`,
          403
        );
      }

      // Perform domain change atomically in a transaction
      const newActivationId = generateId();
      await db.transaction(async (tx) => {
        // Deactivate the old domain
        await tx
          .update(licenseActivation)
          .set({
            isActive: false,
            deactivatedAt: new Date(),
            deactivationReason: `Domain changed to ${domain}`,
          })
          .where(
            and(
              eq(licenseActivation.id, existingActivation.id),
              eq(licenseActivation.isActive, true)
            )
          );

        // Create new activation for the new domain
        await tx.insert(licenseActivation).values({
          id: newActivationId,
          licenseId: licenseData.id,
          domain: domain,
          ipAddress: ipAddress,
          isActive: true,
          activatedAt: new Date(),
        });

        // Increment domain changes used
        await tx
          .update(license)
          .set({
            domainChangesUsed: licenseData.domainChangesUsed + 1,
          })
          .where(eq(license.id, licenseData.id));
      });

      const response = successResponse<ActivateResponseData>(
        {
          license_key: licenseData.licenseKey,
          domain: domain,
          activated_at:
            licenseData.activatedAt?.toISOString() || new Date().toISOString(),
          expires_at: licenseData.expiresAt?.toISOString() || null,
          days_remaining: calculateDaysRemaining(licenseData.expiresAt),
          is_new_activation: false,
          domain_changes_remaining:
            licenseData.maxDomainChanges - licenseData.domainChangesUsed - 1,
          product: {
            name: productData.name,
            slug: productData.slug,
            type: productData.type,
          },
          customer: {
            name: licenseData.customerName,
            email: maskEmail(licenseData.customerEmail),
          },
        },
        `License moved from ${existingActivation.domain} to ${domain}`
      );
      return addRateLimitHeaders(response, rateLimit);
    }

    // Case 3: First-time activation
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + licenseData.validityDays);

    // Perform first-time activation atomically in a transaction
    const activationId = generateId();
    await db.transaction(async (tx) => {
      // Create activation record
      await tx.insert(licenseActivation).values({
        id: activationId,
        licenseId: licenseData.id,
        domain: domain,
        ipAddress: ipAddress,
        isActive: true,
        activatedAt: now,
      });

      // Update license with activation and expiration dates
      await tx
        .update(license)
        .set({
          activatedAt: now,
          expiresAt: expiresAt,
        })
        .where(eq(license.id, licenseData.id));
    });

    const response = successResponse<ActivateResponseData>(
      {
        license_key: licenseData.licenseKey,
        domain: domain,
        activated_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        days_remaining: licenseData.validityDays,
        is_new_activation: true,
        domain_changes_remaining: licenseData.maxDomainChanges,
        product: {
          name: productData.name,
          slug: productData.slug,
          type: productData.type,
        },
        customer: {
          name: licenseData.customerName,
          email: maskEmail(licenseData.customerEmail),
        },
      },
      "License activated successfully"
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
