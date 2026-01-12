"use server";

/**
 * CSV Upload Request Management Server Actions
 *
 * Provides CRUD operations for CSV upload request management in the admin panel.
 * All actions require admin authentication.
 */

import { db } from "@/db/drizzle";
import { naldaCsvUploadRequest, product, license } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import {
  success,
  ok,
  failure,
  notFound,
  withErrorHandling,
  calculatePagination,
  calculateOffset,
} from "./utils";
import type { CsvUploadStatus } from "@/lib/validations/admin";
import type {
  ActionResult,
  CsvUploadTableData,
  CsvUploadFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/csv-uploads";

// =============================================================================
// TYPES
// =============================================================================

interface RawCsvUploadRow {
  id: string;
  licenseId: string;
  domain: string;
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  sftpPassword: string;
  csvFileKey: string;
  csvFileUrl: string;
  csvFileName: string;
  csvFileSize: number;
  status: CsvUploadStatus;
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  licenseKey: string | null;
  customerName: string | null;
  customerEmail: string | null;
  productId: string | null;
}

interface ProductInfo {
  id: string;
  name: string;
  slug: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for CSV upload queries
 */
function getCsvUploadSortField(sortColumn: string) {
  switch (sortColumn) {
    case "domain":
      return naldaCsvUploadRequest.domain;
    case "csvFileName":
      return naldaCsvUploadRequest.csvFileName;
    case "status":
      return naldaCsvUploadRequest.status;
    case "processedAt":
      return naldaCsvUploadRequest.processedAt;
    default:
      return naldaCsvUploadRequest.createdAt;
  }
}

/**
 * Builds where conditions for CSV upload queries
 */
function buildCsvUploadWhereConditions(filters: CsvUploadFilters) {
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
      eq(naldaCsvUploadRequest.status, filters.status as CsvUploadStatus)
    );
  }

  if (filters.licenseId && filters.licenseId !== "all") {
    conditions.push(eq(naldaCsvUploadRequest.licenseId, filters.licenseId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Fetches products by IDs and returns a map
 */
async function fetchProductsMap(
  productIds: string[]
): Promise<Map<string, ProductInfo>> {
  if (productIds.length === 0) return new Map();

  const products = await db
    .select({
      id: product.id,
      name: product.name,
      slug: product.slug,
    })
    .from(product)
    .where(inArray(product.id, productIds));

  return new Map(products.map((p) => [p.id, p]));
}

/**
 * Transforms raw CSV upload row to CsvUploadTableData
 */
function transformCsvUpload(
  upload: RawCsvUploadRow,
  productsMap: Map<string, ProductInfo>
): CsvUploadTableData {
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
}

/**
 * Base select fields for CSV upload queries
 */
const csvUploadSelectFields = {
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
} as const;

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Retrieves paginated list of CSV uploads with filtering and sorting
 */
export async function getCsvUploads(
  filters: CsvUploadFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortColumn = "createdAt",
  sortDirection: SortDirection = "desc"
): Promise<
  ActionResult<{
    csvUploads: CsvUploadTableData[];
    pagination: PaginationConfig;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const whereClause = buildCsvUploadWhereConditions(filters);
    const sortOrder = sortDirection === "asc" ? asc : desc;
    const sortField = getCsvUploadSortField(sortColumn);

    const [csvUploadsRaw, totalResult] = await Promise.all([
      db
        .select(csvUploadSelectFields)
        .from(naldaCsvUploadRequest)
        .leftJoin(license, eq(naldaCsvUploadRequest.licenseId, license.id))
        .where(whereClause)
        .orderBy(sortOrder(sortField))
        .limit(pageSize)
        .offset(calculateOffset(page, pageSize)),
      db
        .select({ count: count() })
        .from(naldaCsvUploadRequest)
        .where(whereClause),
    ]);

    // Fetch products for all licenses
    const productIds = [
      ...new Set(
        csvUploadsRaw.map((u) => u.productId).filter((id): id is string => !!id)
      ),
    ];
    const productsMap = await fetchProductsMap(productIds);

    const csvUploads = csvUploadsRaw.map((upload) =>
      transformCsvUpload(upload as RawCsvUploadRow, productsMap)
    );

    const totalItems = totalResult[0]?.count ?? 0;

    return success({
      csvUploads,
      pagination: calculatePagination(page, pageSize, totalItems),
    });
  }, "Failed to fetch CSV uploads");
}

/**
 * Retrieves a single CSV upload by ID
 */
export async function getCsvUploadById(
  id: string
): Promise<ActionResult<CsvUploadTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [result] = await db
      .select(csvUploadSelectFields)
      .from(naldaCsvUploadRequest)
      .leftJoin(license, eq(naldaCsvUploadRequest.licenseId, license.id))
      .where(eq(naldaCsvUploadRequest.id, id))
      .limit(1);

    if (!result) return notFound("CSV upload");

    // Fetch product if exists
    const productsMap = result.productId
      ? await fetchProductsMap([result.productId])
      : new Map();

    return success(transformCsvUpload(result as RawCsvUploadRow, productsMap));
  }, "Failed to fetch CSV upload");
}

/**
 * Gets aggregated CSV upload statistics
 */
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
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const statuses: CsvUploadStatus[] = [
      "pending",
      "processing",
      "processed",
      "failed",
    ];

    const [totalResult, ...statusResults] = await Promise.all([
      db.select({ count: count() }).from(naldaCsvUploadRequest),
      ...statuses.map((status) =>
        db
          .select({ count: count() })
          .from(naldaCsvUploadRequest)
          .where(eq(naldaCsvUploadRequest.status, status))
      ),
    ]);

    return success({
      total: totalResult[0]?.count ?? 0,
      pending: statusResults[0][0]?.count ?? 0,
      processing: statusResults[1][0]?.count ?? 0,
      processed: statusResults[2][0]?.count ?? 0,
      failed: statusResults[3][0]?.count ?? 0,
    });
  }, "Failed to fetch CSV upload statistics");
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Updates CSV upload status
 */
export async function updateCsvUploadStatus(
  id: string,
  status: CsvUploadStatus,
  errorMessage?: string
): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const updateData: {
      status: CsvUploadStatus;
      processedAt?: Date;
      errorMessage?: string | null;
    } = { status };

    // Set processed time for terminal states
    if (status === "processed" || status === "failed") {
      updateData.processedAt = new Date();
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage || null;
    }

    const [updated] = await db
      .update(naldaCsvUploadRequest)
      .set(updateData)
      .where(eq(naldaCsvUploadRequest.id, id))
      .returning();

    if (!updated) return notFound("CSV upload");

    revalidatePath(REVALIDATION_PATH);

    return ok(`Status updated to ${status}`);
  }, "Failed to update status");
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Deletes a single CSV upload by ID
 */
export async function deleteCsvUpload(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [deleted] = await db
      .delete(naldaCsvUploadRequest)
      .where(eq(naldaCsvUploadRequest.id, id))
      .returning();

    if (!deleted) return notFound("CSV upload");

    revalidatePath(REVALIDATION_PATH);

    return ok("CSV upload deleted successfully");
  }, "Failed to delete CSV upload");
}

/**
 * Deletes multiple CSV uploads by IDs
 */
export async function deleteCsvUploads(ids: string[]): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No CSV uploads selected");
    }

    await db
      .delete(naldaCsvUploadRequest)
      .where(inArray(naldaCsvUploadRequest.id, ids));

    revalidatePath(REVALIDATION_PATH);

    return ok(`${ids.length} CSV upload(s) deleted successfully`);
  }, "Failed to delete CSV uploads");
}
