"use server";

/**
 * License Management Server Actions
 *
 * Provides CRUD operations for license management in the admin panel.
 * All actions require admin authentication.
 */

import { db } from "@/db/drizzle";
import { license, product } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import {
  success,
  ok,
  failure,
  notFound,
  validationError,
  withErrorHandling,
  calculatePagination,
  calculateOffset,
  getFormField,
  getOptionalField,
  generateId,
  generateLicenseKey,
} from "./utils";
import { licenseSchema, type LicenseStatus } from "@/lib/validations/admin";
import type {
  ActionResult,
  LicenseTableData,
  LicenseFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/licenses";
const MAX_LICENSE_KEY_ATTEMPTS = 10;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for license queries
 */
function getLicenseSortField(sortColumn: string) {
  switch (sortColumn) {
    case "licenseKey":
      return license.licenseKey;
    case "customerName":
      return license.customerName;
    case "customerEmail":
      return license.customerEmail;
    case "status":
      return license.status;
    case "expiresAt":
      return license.expiresAt;
    default:
      return license.createdAt;
  }
}

/**
 * Builds where conditions for license queries
 */
function buildLicenseWhereConditions(filters: LicenseFilters) {
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(license.licenseKey, `%${filters.search}%`),
        ilike(license.customerName, `%${filters.search}%`),
        ilike(license.customerEmail, `%${filters.search}%`)
      )
    );
  }

  if (filters.status && filters.status !== "all") {
    conditions.push(eq(license.status, filters.status as LicenseStatus));
  }

  if (filters.productId && filters.productId !== "all") {
    conditions.push(eq(license.productId, filters.productId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Generates a unique license key
 */
async function generateUniqueLicenseKey(): Promise<string> {
  let licenseKey = generateLicenseKey();
  let attempts = 0;

  while (attempts < MAX_LICENSE_KEY_ATTEMPTS) {
    const existing = await db.query.license.findFirst({
      where: eq(license.licenseKey, licenseKey),
      columns: { id: true },
    });

    if (!existing) return licenseKey;

    licenseKey = generateLicenseKey();
    attempts++;
  }

  // Fallback with timestamp for uniqueness
  return `${generateLicenseKey()}-${Date.now().toString(36).toUpperCase()}`;
}

/**
 * Verifies a product exists
 */
async function verifyProductExists(productId: string): Promise<boolean> {
  const existingProduct = await db.query.product.findFirst({
    where: eq(product.id, productId),
    columns: { id: true },
  });
  return !!existingProduct;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Retrieves paginated list of licenses with filtering and sorting
 */
export async function getLicenses(
  filters: LicenseFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortColumn = "createdAt",
  sortDirection: SortDirection = "desc"
): Promise<
  ActionResult<{ licenses: LicenseTableData[]; pagination: PaginationConfig }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const whereClause = buildLicenseWhereConditions(filters);
    const sortOrder = sortDirection === "asc" ? asc : desc;
    const sortField = getLicenseSortField(sortColumn);

    const [licenses, totalResult] = await Promise.all([
      db.query.license.findMany({
        where: whereClause,
        orderBy: sortOrder(sortField),
        limit: pageSize,
        offset: calculateOffset(page, pageSize),
        with: {
          product: {
            columns: { id: true, name: true, slug: true },
          },
        },
      }),
      db.select({ count: count() }).from(license).where(whereClause),
    ]);

    const totalItems = totalResult[0]?.count ?? 0;

    return success({
      licenses: licenses as LicenseTableData[],
      pagination: calculatePagination(page, pageSize, totalItems),
    });
  }, "Failed to fetch licenses");
}

/**
 * Retrieves a single license by ID
 */
export async function getLicenseById(
  id: string
): Promise<ActionResult<LicenseTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const result = await db.query.license.findFirst({
      where: eq(license.id, id),
      with: {
        product: {
          columns: { id: true, name: true, slug: true },
        },
      },
    });

    if (!result) return notFound("License");

    return success(result as LicenseTableData);
  }, "Failed to fetch license");
}

/**
 * Gets aggregated license statistics
 */
export async function getLicenseStats(): Promise<
  ActionResult<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [totalResult, activeResult, expiredResult, revokedResult] =
      await Promise.all([
        db.select({ count: count() }).from(license),
        db
          .select({ count: count() })
          .from(license)
          .where(eq(license.status, "active")),
        db
          .select({ count: count() })
          .from(license)
          .where(eq(license.status, "expired")),
        db
          .select({ count: count() })
          .from(license)
          .where(eq(license.status, "revoked")),
      ]);

    return success({
      total: totalResult[0]?.count ?? 0,
      active: activeResult[0]?.count ?? 0,
      expired: expiredResult[0]?.count ?? 0,
      revoked: revokedResult[0]?.count ?? 0,
    });
  }, "Failed to fetch license statistics");
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Creates a new license
 */
export async function createLicense(
  formData: FormData
): Promise<ActionResult<LicenseTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      productId: getFormField(formData, "productId"),
      customerName: getOptionalField(formData, "customerName"),
      customerEmail: getOptionalField(formData, "customerEmail"),
      status: (getFormField(formData, "status") || "active") as LicenseStatus,
      validityDays: getFormField(formData, "validityDays"),
      maxDomainChanges: getFormField(formData, "maxDomainChanges"),
      notes: getOptionalField(formData, "notes"),
    };

    const validated = licenseSchema.create.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Verify product exists
    if (!(await verifyProductExists(validated.data.productId))) {
      return notFound("Product");
    }

    const licenseKey = await generateUniqueLicenseKey();

    const [newLicense] = await db
      .insert(license)
      .values({
        id: generateId(),
        productId: validated.data.productId,
        licenseKey,
        customerName: validated.data.customerName ?? null,
        customerEmail: validated.data.customerEmail ?? null,
        status: validated.data.status,
        validityDays: validated.data.validityDays,
        maxDomainChanges: validated.data.maxDomainChanges,
        notes: validated.data.notes ?? null,
      })
      .returning();

    revalidatePath(REVALIDATION_PATH);

    return success(
      newLicense as LicenseTableData,
      "License created successfully"
    );
  }, "Failed to create license");
}

/**
 * Updates an existing license
 */
export async function updateLicense(
  formData: FormData
): Promise<ActionResult<LicenseTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      id: getFormField(formData, "id"),
      productId: getFormField(formData, "productId"),
      customerName: getOptionalField(formData, "customerName"),
      customerEmail: getOptionalField(formData, "customerEmail"),
      status: getFormField(formData, "status") as LicenseStatus,
      validityDays: getFormField(formData, "validityDays"),
      maxDomainChanges: getFormField(formData, "maxDomainChanges"),
      notes: getOptionalField(formData, "notes"),
    };

    const validated = licenseSchema.update.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Verify product exists
    if (!(await verifyProductExists(validated.data.productId))) {
      return notFound("Product");
    }

    const [updatedLicense] = await db
      .update(license)
      .set({
        productId: validated.data.productId,
        customerName: validated.data.customerName ?? null,
        customerEmail: validated.data.customerEmail ?? null,
        status: validated.data.status,
        validityDays: validated.data.validityDays,
        maxDomainChanges: validated.data.maxDomainChanges,
        notes: validated.data.notes ?? null,
      })
      .where(eq(license.id, validated.data.id))
      .returning();

    if (!updatedLicense) return notFound("License");

    revalidatePath(REVALIDATION_PATH);

    return success(
      updatedLicense as LicenseTableData,
      "License updated successfully"
    );
  }, "Failed to update license");
}

/**
 * Revokes a license (sets status to revoked)
 */
export async function revokeLicense(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [updatedLicense] = await db
      .update(license)
      .set({ status: "revoked" })
      .where(eq(license.id, id))
      .returning();

    if (!updatedLicense) return notFound("License");

    revalidatePath(REVALIDATION_PATH);

    return ok("License revoked successfully");
  }, "Failed to revoke license");
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Deletes a single license by ID
 */
export async function deleteLicense(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [deletedLicense] = await db
      .delete(license)
      .where(eq(license.id, id))
      .returning();

    if (!deletedLicense) return notFound("License");

    revalidatePath(REVALIDATION_PATH);

    return ok("License deleted successfully");
  }, "Failed to delete license");
}

/**
 * Deletes multiple licenses by IDs
 */
export async function deleteLicenses(ids: string[]): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No licenses selected");
    }

    await db.delete(license).where(inArray(license.id, ids));

    revalidatePath(REVALIDATION_PATH);

    return ok(`${ids.length} license(s) deleted successfully`);
  }, "Failed to delete licenses");
}
