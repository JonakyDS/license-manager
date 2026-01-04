/**
 * UploadThing API Route Handler
 *
 * Handles file upload requests through UploadThing.
 * This route is automatically called by the UploadThing client.
 */

import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
