/**
 * List Nalda CSV Upload Requests API Endpoint
 *
 * GET /api/v2/nalda/csv-upload/list
 *
 * Lists CSV upload requests for a specific license and domain.
 * Returns paginated results.
 *
 * Security:
 * - Validates license key and domain combination
 * - Only returns requests for the authenticated license/domain
 * - Rate limited to prevent abuse
 *
 * Query Parameters:
 * - license_key: Required - The license key
 * - domain: Required - The domain
 * - page: Optional - Page number (default: 1)
 * - limit: Optional - Items per page (default: 10, max: 100)
 * - status: Optional - Filter by status (pending, processing, processed, failed)
 */

import { NextRequest } from "next/server";
import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest } from "@/db/schema";
import { eq, and, desc, count, SQL } from "drizzle-orm";
import {
  successResponse,
  errorResponse,
  logApiRequest,
  logApiError,
  validationErrorResponse,
  validateLicenseAndDomainForNalda,
} from "@/lib/api/v2/utils";
import { listNaldaCsvUploadRequestsSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from "@/lib/api/v2/rate-limit";
import type {
  NaldaCsvUploadRequestListItem,
  NaldaCsvUploadRequestListResponseData,
} from "@/lib/api/v2/types";

export async function GET(request: NextRequest) {
  const endpoint = "/api/v2/nalda/csv-upload/list";

  try {
    // Check rate limit
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIp, "general");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      license_key: searchParams.get("license_key") || "",
      domain: searchParams.get("domain") || "",
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      status: searchParams.get("status") || undefined,
    };

    // Validate query parameters
    const validationResult =
      listNaldaCsvUploadRequestsSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return validationErrorResponse(validationResult.error);
    }

    const { license_key, domain, page, limit, status } = validationResult.data;

    logApiRequest(endpoint, "GET", {
      license_key,
      domain,
      page,
      limit,
      status,
    });

    // Validate license and domain using shared utility
    // Allow viewing history even for expired/revoked licenses
    const licenseValidation = await validateLicenseAndDomainForNalda(
      license_key,
      domain,
      { requireActiveActivation: false, updateExpiredStatus: false }
    );

    if (!licenseValidation.valid) {
      return errorResponse(
        licenseValidation.code as Parameters<typeof errorResponse>[0],
        licenseValidation.error,
        licenseValidation.code === "LICENSE_NOT_FOUND" ? 404 : 403
      );
    }

    // Build where conditions
    const whereConditions: SQL[] = [
      eq(naldaCsvUploadRequest.licenseId, licenseValidation.licenseId),
      eq(naldaCsvUploadRequest.domain, domain),
    ];

    if (status) {
      whereConditions.push(eq(naldaCsvUploadRequest.status, status));
    }

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(naldaCsvUploadRequest)
      .where(and(...whereConditions));

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Get paginated results
    const requests = await db
      .select({
        id: naldaCsvUploadRequest.id,
        domain: naldaCsvUploadRequest.domain,
        csvFileKey: naldaCsvUploadRequest.csvFileKey,
        status: naldaCsvUploadRequest.status,
        processedAt: naldaCsvUploadRequest.processedAt,
        errorMessage: naldaCsvUploadRequest.errorMessage,
        createdAt: naldaCsvUploadRequest.createdAt,
      })
      .from(naldaCsvUploadRequest)
      .where(and(...whereConditions))
      .orderBy(desc(naldaCsvUploadRequest.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform results
    const formattedRequests: NaldaCsvUploadRequestListItem[] = requests.map(
      (req) => ({
        id: req.id,
        domain: req.domain,
        csv_file_key: req.csvFileKey,
        status: req.status,
        processed_at: req.processedAt?.toISOString() || null,
        error_message: req.errorMessage,
        created_at: req.createdAt.toISOString(),
      })
    );

    const responseData: NaldaCsvUploadRequestListResponseData = {
      requests: formattedRequests,
      pagination: {
        page,
        limit,
        total,
        total_pages: totalPages,
        has_next: page < totalPages,
        has_prev: page > 1,
      },
    };

    const response = successResponse(responseData);

    // Add rate limit headers if available
    if (rateLimitResult) {
      return addRateLimitHeaders(response, rateLimitResult);
    }

    return response;
  } catch (error) {
    logApiError(endpoint, error);

    return errorResponse(
      "INTERNAL_ERROR",
      "An unexpected error occurred while processing the request",
      500
    );
  }
}
