/**
 * Nalda CSV Upload Request API Endpoint
 *
 * POST /api/v2/nalda/csv-upload
 *
 * Creates a new CSV upload request for processing.
 * The CSV file should already be uploaded to UploadThing.
 *
 * Security:
 * - Validates license key and domain combination
 * - License must be active and not expired
 * - Domain must be activated for the license
 * - Rate limited to prevent abuse
 * - SFTP credentials are stored securely
 */

import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest } from "@/db/schema";
import {
  successResponse,
  errorResponse,
  parseRequestBody,
  logApiRequest,
  logApiError,
  validateLicenseAndDomainForNalda,
} from "@/lib/api/v2/utils";
import { naldaCsvUploadRequestSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from "@/lib/api/v2/rate-limit";
import type { NaldaCsvUploadRequestResponseData } from "@/lib/api/v2/types";

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/nalda/csv-upload";

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
      naldaCsvUploadRequestSchema
    );

    if (!parseResult.success) {
      return parseResult.error;
    }

    const {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      sftp_username,
      sftp_password,
      csv_file_key,
    } = parseResult.data;

    logApiRequest(endpoint, "POST", {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      csv_file_key,
    });

    // Validate license and domain using shared utility
    const validationResult = await validateLicenseAndDomainForNalda(
      license_key,
      domain,
      { requireActiveActivation: true, updateExpiredStatus: true }
    );

    if (!validationResult.valid) {
      return errorResponse(
        validationResult.code as Parameters<typeof errorResponse>[0],
        validationResult.error,
        validationResult.code === "LICENSE_NOT_FOUND" ? 404 : 403
      );
    }

    // Create the upload request
    const requestId = nanoid();
    const now = new Date();

    await db.insert(naldaCsvUploadRequest).values({
      id: requestId,
      licenseId: validationResult.licenseId,
      domain,
      sftpHost: sftp_host,
      sftpPort: sftp_port,
      sftpUsername: sftp_username,
      sftpPassword: sftp_password, // TODO: Encrypt in production
      csvFileKey: csv_file_key,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const responseData: NaldaCsvUploadRequestResponseData = {
      id: requestId,
      license_id: validationResult.licenseId,
      domain,
      csv_file_key,
      status: "pending",
      created_at: now.toISOString(),
    };

    const response = successResponse(
      responseData,
      "CSV upload request created successfully",
      201
    );

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
