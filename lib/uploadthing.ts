/**
 * UploadThing Configuration
 *
 * Configures file upload routes for the application.
 * Uses presigned URLs - files are uploaded directly from client to UploadThing,
 * never passing through our server.
 *
 * Environment Variables Required:
 * - UPLOADTHING_TOKEN: Your UploadThing API token
 */

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { validateLicenseAndDomainForNalda } from "@/lib/api/v2/utils";

const f = createUploadthing();

/**
 * Validates license key and domain combination for UploadThing.
 * Returns the license ID if valid, throws UploadThingError otherwise.
 *
 * Uses the shared validation function but converts results to UploadThing errors.
 */
async function validateForUpload(
  licenseKey: string,
  domain: string
): Promise<string> {
  const result = await validateLicenseAndDomainForNalda(licenseKey, domain, {
    requireActiveActivation: true,
    updateExpiredStatus: true,
  });

  if (!result.valid) {
    throw new UploadThingError(result.error);
  }

  return result.licenseId;
}

/**
 * File router configuration for UploadThing.
 *
 * IMPORTANT: Files are uploaded directly from client to UploadThing servers
 * using presigned URLs. The actual file data NEVER passes through our server.
 *
 * Flow:
 * 1. Client calls our endpoint with license_key and domain
 * 2. Our middleware validates the license/domain (no file data yet)
 * 3. UploadThing returns presigned URLs to the client
 * 4. Client uploads file directly to UploadThing's S3-compatible storage
 * 5. UploadThing calls our onUploadComplete webhook with file metadata
 */
export const ourFileRouter = {
  /**
   * CSV file uploader for Nalda license requests.
   *
   * Security: License validation happens BEFORE presigned URLs are generated.
   * Only valid license holders can get upload URLs.
   */
  naldaCsvUploader: f({
    "text/csv": { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .input(
      z.object({
        license_key: z
          .string()
          .min(1, "License key is required")
          .transform((val) => val.toUpperCase().trim()),
        domain: z
          .string()
          .min(1, "Domain is required")
          .transform(
            (val) =>
              val
                .toLowerCase()
                .trim()
                .replace(/^https?:\/\//, "")
                .replace(/\/$/, "")
                .split("/")[0]
          ),
      })
    )
    .middleware(async ({ input }) => {
      // Validate license and domain BEFORE generating presigned URLs
      // This ensures only valid license holders can upload
      const licenseId = await validateForUpload(
        input.license_key,
        input.domain
      );

      // Return metadata - will be available in onUploadComplete
      return {
        licenseId,
        domain: input.domain,
        uploadedAt: new Date().toISOString(),
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Called by UploadThing webhook after direct upload completes
      // The file was uploaded directly to UploadThing, not our server
      console.log(
        `[UploadThing] CSV uploaded for license ${metadata.licenseId} on domain ${metadata.domain}`
      );
      console.log(`[UploadThing] File key: ${file.key}, URL: ${file.ufsUrl}`);

      // Return data to the client
      return {
        fileKey: file.key,
        fileUrl: file.ufsUrl,
        fileName: file.name,
        fileSize: file.size,
        licenseId: metadata.licenseId,
        domain: metadata.domain,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
