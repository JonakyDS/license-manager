/**
 * UploadThing Configuration
 *
 * Configures file upload routes for the application.
 * Uses server-side upload - files are received by our API and then uploaded to UploadThing.
 *
 * Environment Variables Required:
 * - UPLOADTHING_TOKEN: Your UploadThing API token
 */

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi } from "uploadthing/server";

const f = createUploadthing();

/**
 * UploadThing API instance for server-side uploads.
 * Use this to upload files from the server after validating license keys.
 */
export const utapi = new UTApi();

/**
 * File router configuration for UploadThing.
 * This is still needed for the UploadThing dashboard and file management.
 */
export const ourFileRouter = {
  /**
   * CSV file uploader for Nalda license requests.
   * Note: This endpoint is not used directly by clients.
   * Files are uploaded server-side via UTApi after license validation.
   */
  naldaCsvUploader: f({
    "text/csv": { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      // This middleware is not used for server-side uploads
      // but is required by UploadThing for the route definition
      return {};
    })
    .onUploadComplete(async ({ file }) => {
      console.log(`[UploadThing] CSV uploaded: ${file.key}`);
      return { fileKey: file.key, fileUrl: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
