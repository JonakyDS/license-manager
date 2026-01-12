"use server";

import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest, product, license } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type {
  ActionResult,
  CsvUploadTableData,
  CsvUploadFilters,
  PaginationConfig,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import { requireAdmin } from "./auth";

// Get CSV uploads with pagination, search, and filters
export async function getCsvUploads(
  filters: CsvUploadFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortColumn: string = "createdAt",
  sortDirection: "asc" | "desc" = "desc"
): Promise<
  ActionResult<{
    csvUploads: CsvUploadTableData[];
    pagination: PaginationConfig;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const offset = (page - 1) * pageSize;

    // Build where conditions
    const conditions = [];

    if (filters.search) {
      conditions.push(
        or(
          ilike(naldaCsvUploadRequest.domain, `%${filters.search}%`),
          ilike(naldaCsvUploadRequest.csvFileName, `%${filters.search}%`),
          ilike(naldaCsvUploadRequest.sftpHost, `%${filters.search}%`)
        )
      );
    }

    if (filters.status && filters.status !== "all") {
      conditions.push(
        eq(
          naldaCsvUploadRequest.status,
          filters.status as "pending" | "processing" | "processed" | "failed"
        )
      );
    }

    if (filters.licenseId && filters.licenseId !== "all") {
      conditions.push(eq(naldaCsvUploadRequest.licenseId, filters.licenseId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get sort order
    const sortOrder = sortDirection === "asc" ? asc : desc;
    const sortField =
      sortColumn === "domain"
        ? naldaCsvUploadRequest.domain
        : sortColumn === "csvFileName"
          ? naldaCsvUploadRequest.csvFileName
          : sortColumn === "status"
            ? naldaCsvUploadRequest.status
            : sortColumn === "processedAt"
              ? naldaCsvUploadRequest.processedAt
              : naldaCsvUploadRequest.createdAt;

    // Execute queries using standard select with left join
    const [csvUploadsRaw, totalResult] = await Promise.all([
      db
        .select({
          id: naldaCsvUploadRequest.id,
          licenseId: naldaCsvUploadRequest.licenseId,
          domain: naldaCsvUploadRequest.domain,
          sftpHost: naldaCsvUploadRequest.sftpHost,
          sftpPort: naldaCsvUploadRequest.sftpPort,
          sftpUsername: naldaCsvUploadRequest.sftpUsername,
          sftpPassword: naldaCsvUploadRequest.sftpPassword,
          csvFileKey: naldaCsvUploadRequest.csvFileKey,
          csvFileUrl: naldaCsvUploadRequest.csvFileUrl,
          csvFileName: naldaCsvUploadRequest.csvFileName,
          csvFileSize: naldaCsvUploadRequest.csvFileSize,
          status: naldaCsvUploadRequest.status,
          processedAt: naldaCsvUploadRequest.processedAt,
          errorMessage: naldaCsvUploadRequest.errorMessage,
          createdAt: naldaCsvUploadRequest.createdAt,
          updatedAt: naldaCsvUploadRequest.updatedAt,
          licenseKey: license.licenseKey,
          customerName: license.customerName,
          customerEmail: license.customerEmail,
          productId: license.productId,
        })
        .from(naldaCsvUploadRequest)
        .leftJoin(license, eq(naldaCsvUploadRequest.licenseId, license.id))
        .where(whereClause)
        .orderBy(sortOrder(sortField))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(whereClause),
    ]);

    // Get unique product IDs from licenses
    const productIds = [
      ...new Set(
        csvUploadsRaw.map((u) => u.productId).filter((id): id is string => !!id)
      ),
    ];

    // Fetch products if there are any
    let productsMap: Map<string, { id: string; name: string; slug: string }> =
      new Map();
    if (productIds.length > 0) {
      const products = await db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
        })
        .from(product)
        .where(inArray(product.id, productIds));

      productsMap = new Map(products.map((p) => [p.id, p]));
    }

    // Transform to CsvUploadTableData format
    const csvUploads: CsvUploadTableData[] = csvUploadsRaw.map((upload) => {
      const productData = upload.productId
        ? productsMap.get(upload.productId)
        : undefined;

      return {
        id: upload.id,
        licenseId: upload.licenseId,
        domain: upload.domain,
        sftpHost: upload.sftpHost,
        sftpPort: upload.sftpPort,
        sftpUsername: upload.sftpUsername,
        sftpPassword: upload.sftpPassword,
        csvFileKey: upload.csvFileKey,
        csvFileUrl: upload.csvFileUrl,
        csvFileName: upload.csvFileName,
        csvFileSize: upload.csvFileSize,
        status: upload.status,
        processedAt: upload.processedAt,
        errorMessage: upload.errorMessage,
        createdAt: upload.createdAt,
        updatedAt: upload.updatedAt,
        license: upload.licenseKey
          ? {
              id: upload.licenseId,
              licenseKey: upload.licenseKey,
              customerName: upload.customerName,
              customerEmail: upload.customerEmail,
              product: productData,
            }
          : undefined,
      };
    });

    const totalItems = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      success: true,
      data: {
        csvUploads,
        pagination: {
          page,
          pageSize,
          totalItems,
          totalPages,
        },
      },
    };
  } catch (error) {
    console.error("Error fetching CSV uploads:", error);
    return { success: false, message: "Failed to fetch CSV uploads" };
  }
}

// Get single CSV upload by ID
export async function getCsvUploadById(
  id: string
): Promise<ActionResult<CsvUploadTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const results = await db
      .select({
        id: naldaCsvUploadRequest.id,
        licenseId: naldaCsvUploadRequest.licenseId,
        domain: naldaCsvUploadRequest.domain,
        sftpHost: naldaCsvUploadRequest.sftpHost,
        sftpPort: naldaCsvUploadRequest.sftpPort,
        sftpUsername: naldaCsvUploadRequest.sftpUsername,
        sftpPassword: naldaCsvUploadRequest.sftpPassword,
        csvFileKey: naldaCsvUploadRequest.csvFileKey,
        csvFileUrl: naldaCsvUploadRequest.csvFileUrl,
        csvFileName: naldaCsvUploadRequest.csvFileName,
        csvFileSize: naldaCsvUploadRequest.csvFileSize,
        status: naldaCsvUploadRequest.status,
        processedAt: naldaCsvUploadRequest.processedAt,
        errorMessage: naldaCsvUploadRequest.errorMessage,
        createdAt: naldaCsvUploadRequest.createdAt,
        updatedAt: naldaCsvUploadRequest.updatedAt,
        licenseKey: license.licenseKey,
        customerName: license.customerName,
        customerEmail: license.customerEmail,
        productId: license.productId,
      })
      .from(naldaCsvUploadRequest)
      .leftJoin(license, eq(naldaCsvUploadRequest.licenseId, license.id))
      .where(eq(naldaCsvUploadRequest.id, id))
      .limit(1);

    const result = results[0];

    if (!result) {
      return { success: false, message: "CSV upload not found" };
    }

    // Fetch product if license has a productId
    let productData: { id: string; name: string; slug: string } | undefined;
    if (result.productId) {
      const productResult = await db
        .select({
          id: product.id,
          name: product.name,
          slug: product.slug,
        })
        .from(product)
        .where(eq(product.id, result.productId))
        .limit(1);

      productData = productResult[0];
    }

    // Construct the response with nested product
    const csvUpload: CsvUploadTableData = {
      id: result.id,
      licenseId: result.licenseId,
      domain: result.domain,
      sftpHost: result.sftpHost,
      sftpPort: result.sftpPort,
      sftpUsername: result.sftpUsername,
      sftpPassword: result.sftpPassword,
      csvFileKey: result.csvFileKey,
      csvFileUrl: result.csvFileUrl,
      csvFileName: result.csvFileName,
      csvFileSize: result.csvFileSize,
      status: result.status,
      processedAt: result.processedAt,
      errorMessage: result.errorMessage,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      license: result.licenseKey
        ? {
            id: result.licenseId,
            licenseKey: result.licenseKey,
            customerName: result.customerName,
            customerEmail: result.customerEmail,
            product: productData,
          }
        : undefined,
    };

    return { success: true, data: csvUpload };
  } catch (error) {
    console.error("Error fetching CSV upload:", error);
    return { success: false, message: "Failed to fetch CSV upload" };
  }
}

// Delete a CSV upload
export async function deleteCsvUpload(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const deletedCsvUpload = await db
      .delete(naldaCsvUploadRequest)
      .where(eq(naldaCsvUploadRequest.id, id))
      .returning();

    if (deletedCsvUpload.length === 0) {
      return { success: false, message: "CSV upload not found" };
    }

    revalidatePath("/admin/csv-uploads");

    return { success: true, message: "CSV upload deleted successfully" };
  } catch (error) {
    console.error("Error deleting CSV upload:", error);
    return { success: false, message: "Failed to delete CSV upload" };
  }
}

// Delete multiple CSV uploads
export async function deleteCsvUploads(ids: string[]): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    if (ids.length === 0) {
      return { success: false, message: "No CSV uploads selected" };
    }

    for (const id of ids) {
      await db
        .delete(naldaCsvUploadRequest)
        .where(eq(naldaCsvUploadRequest.id, id));
    }

    revalidatePath("/admin/csv-uploads");

    return {
      success: true,
      message: `${ids.length} CSV upload(s) deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting CSV uploads:", error);
    return { success: false, message: "Failed to delete CSV uploads" };
  }
}

// Update CSV upload status (for processing)
export async function updateCsvUploadStatus(
  id: string,
  status: "pending" | "processing" | "processed" | "failed",
  errorMessage?: string
): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const updateData: {
      status: "pending" | "processing" | "processed" | "failed";
      processedAt?: Date;
      errorMessage?: string | null;
    } = {
      status,
    };

    if (status === "processed" || status === "failed") {
      updateData.processedAt = new Date();
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage || null;
    }

    const updatedCsvUpload = await db
      .update(naldaCsvUploadRequest)
      .set(updateData)
      .where(eq(naldaCsvUploadRequest.id, id))
      .returning();

    if (updatedCsvUpload.length === 0) {
      return { success: false, message: "CSV upload not found" };
    }

    revalidatePath("/admin/csv-uploads");

    return { success: true, message: `Status updated to ${status}` };
  } catch (error) {
    console.error("Error updating CSV upload status:", error);
    return { success: false, message: "Failed to update status" };
  }
}

// Get CSV upload statistics
export async function getCsvUploadStats(): Promise<
  ActionResult<{
    total: number;
    pending: number;
    processing: number;
    processed: number;
    failed: number;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) {
    return adminCheck;
  }

  try {
    const [
      totalResult,
      pendingResult,
      processingResult,
      processedResult,
      failedResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(naldaCsvUploadRequest),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(eq(naldaCsvUploadRequest.status, "pending")),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(eq(naldaCsvUploadRequest.status, "processing")),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(eq(naldaCsvUploadRequest.status, "processed")),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(eq(naldaCsvUploadRequest.status, "failed")),
    ]);

    return {
      success: true,
      data: {
        total: totalResult[0]?.count ?? 0,
        pending: pendingResult[0]?.count ?? 0,
        processing: processingResult[0]?.count ?? 0,
        processed: processedResult[0]?.count ?? 0,
        failed: failedResult[0]?.count ?? 0,
      },
    };
  } catch (error) {
    console.error("Error fetching CSV upload stats:", error);
    return { success: false, message: "Failed to fetch CSV upload statistics" };
  }
}
