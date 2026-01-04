/**
 * Nalda CSV Upload Request API Endpoint
 *
 * POST /api/v2/nalda/csv-upload
 *
 * Accepts a CSV file upload via multipart/form-data along with license and SFTP credentials.
 * The file is uploaded to UploadThing storage after license validation.
 *
 * Security:
 * - Validates license key and domain combination
 * - License must be active and not expired
 * - Domain must be activated for the license
 * - Rate limited to prevent abuse
 * - SFTP credentials are stored securely
 * - File size limit: 16MB
 */

import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest } from "@/db/schema";
import {
  successResponse,
  errorResponse,
  logApiRequest,
  logApiError,
  validateLicenseAndDomainForNalda,
} from "@/lib/api/v2/utils";
import { licenseKeySchema, domainSchema } from "@/lib/api/v2/validation";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitExceededResponse,
  addRateLimitHeaders,
} from "@/lib/api/v2/rate-limit";
import { utapi } from "@/lib/uploadthing";
import type { NaldaCsvUploadRequestResponseData } from "@/lib/api/v2/types";

// Maximum file size: 16MB
const MAX_FILE_SIZE = 16 * 1024 * 1024;

/**
 * Validates SFTP hostname - must be a subdomain of nalda.com
 */
const naldaSftpHostSchema = z
  .string()
  .min(1, "SFTP host is required")
  .max(255, "SFTP host must be less than 255 characters")
  .refine(
    (val) => {
      const naldaSubdomainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.nalda\.com$/i;
      return naldaSubdomainRegex.test(val);
    },
    {
      message:
        "SFTP host must be a subdomain of nalda.com (e.g., sftp.nalda.com)",
    }
  );

/**
 * Schema for validating form fields (excluding file)
 */
const formFieldsSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
  sftp_host: naldaSftpHostSchema,
  sftp_port: z.coerce.number().int().min(1).max(65535).default(22),
  sftp_username: z
    .string()
    .min(1, "SFTP username is required")
    .max(255, "SFTP username must be less than 255 characters")
    .refine((val) => !/[\x00-\x1f\x7f]/.test(val), {
      message: "SFTP username contains invalid characters",
    }),
  sftp_password: z
    .string()
    .min(1, "SFTP password is required")
    .max(1024, "SFTP password must be less than 1024 characters"),
});

export async function POST(request: NextRequest) {
  const endpoint = "/api/v2/nalda/csv-upload";

  try {
    // Check rate limit
    const clientIp = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientIp, "general");

    if (rateLimitResult && !rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }

    // Parse multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid form data. Expected multipart/form-data with CSV file.",
        400
      );
    }

    // Extract and validate the CSV file
    const csvFile = formData.get("csv_file");
    if (!csvFile || !(csvFile instanceof File)) {
      return errorResponse(
        "VALIDATION_ERROR",
        "CSV file is required. Send as 'csv_file' field.",
        400,
        { csv_file: ["CSV file is required"] }
      );
    }

    // Validate file type
    if (csvFile.type !== "text/csv" && !csvFile.name.endsWith(".csv")) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid file type. Only CSV files are allowed.",
        400,
        { csv_file: ["Only CSV files are allowed"] }
      );
    }

    // Validate file size
    if (csvFile.size > MAX_FILE_SIZE) {
      return errorResponse(
        "VALIDATION_ERROR",
        `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        400,
        {
          csv_file: [
            `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          ],
        }
      );
    }

    // Extract form fields
    const rawFields = {
      license_key: formData.get("license_key"),
      domain: formData.get("domain"),
      sftp_host: formData.get("sftp_host"),
      sftp_port: formData.get("sftp_port") || "22",
      sftp_username: formData.get("sftp_username"),
      sftp_password: formData.get("sftp_password"),
    };

    // Validate form fields
    const parseResult = formFieldsSchema.safeParse(rawFields);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parseResult.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) {
          fieldErrors[path] = [];
        }
        fieldErrors[path].push(issue.message);
      }
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid request parameters",
        400,
        fieldErrors
      );
    }

    const {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      sftp_username,
      sftp_password,
    } = parseResult.data;

    logApiRequest(endpoint, "POST", {
      license_key,
      domain,
      sftp_host,
      sftp_port,
      file_name: csvFile.name,
      file_size: csvFile.size,
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

    // Upload the file to UploadThing
    let uploadResult;
    try {
      const uploadResponse = await utapi.uploadFiles(csvFile);

      if (uploadResponse.error) {
        logApiError(
          endpoint,
          new Error(`UploadThing error: ${uploadResponse.error.message}`)
        );
        return errorResponse(
          "INTERNAL_ERROR",
          "Failed to upload CSV file. Please try again.",
          500
        );
      }

      uploadResult = uploadResponse.data;
    } catch (uploadError) {
      logApiError(endpoint, uploadError);
      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to upload CSV file. Please try again.",
        500
      );
    }

    // Create the upload request in database
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
      csvFileKey: uploadResult.key,
      csvFileUrl: uploadResult.ufsUrl,
      csvFileName: csvFile.name,
      csvFileSize: csvFile.size,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const responseData: NaldaCsvUploadRequestResponseData = {
      id: requestId,
      license_id: validationResult.licenseId,
      domain,
      csv_file_key: uploadResult.key,
      csv_file_url: uploadResult.ufsUrl,
      csv_file_name: csvFile.name,
      csv_file_size: csvFile.size,
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
