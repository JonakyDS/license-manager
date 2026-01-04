"use server";

import { db } from "@/db/drizzle";
import { license, product } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ActionResult,
  LicenseTableData,
  LicenseFilters,
  PaginationConfig,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// Generate a license key
function generateLicenseKey(): string {
  const segments = [];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }
  return segments.join("-");
}

// Validation schemas
const createLicenseSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["active", "expired", "revoked"]).optional().default("active"),
  validityDays: z.coerce
    .number()
    .min(1, "Validity must be at least 1 day")
    .default(365),
  maxDomainChanges: z.coerce.number().min(0).default(3),
  notes: z.string().optional(),
});

const updateLicenseSchema = z.object({
  id: z.string().min(1, "License ID is required"),
  productId: z.string().min(1, "Product is required"),
  customerName: z.string().optional(),
  customerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  status: z.enum(["active", "expired", "revoked"]),
  validityDays: z.coerce.number().min(1, "Validity must be at least 1 day"),
  maxDomainChanges: z.coerce.number().min(0),
  notes: z.string().optional(),
});

// Get licenses with pagination, search, and filters
export async function getLicenses(
  filters: LicenseFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortColumn: string = "createdAt",
  sortDirection: "asc" | "desc" = "desc"
): Promise<{
  licenses: LicenseTableData[];
  pagination: PaginationConfig;
}> {
  const offset = (page - 1) * pageSize;

  // Build where conditions
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
    conditions.push(
      eq(license.status, filters.status as "active" | "expired" | "revoked")
    );
  }

  if (filters.productId && filters.productId !== "all") {
    conditions.push(eq(license.productId, filters.productId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get sort order
  const sortOrder = sortDirection === "asc" ? asc : desc;
  const sortField =
    sortColumn === "licenseKey"
      ? license.licenseKey
      : sortColumn === "customerName"
        ? license.customerName
        : sortColumn === "customerEmail"
          ? license.customerEmail
          : sortColumn === "status"
            ? license.status
            : sortColumn === "expiresAt"
              ? license.expiresAt
              : license.createdAt;

  // Execute queries with product join
  const [licenses, totalResult] = await Promise.all([
    db
      .select({
        id: license.id,
        productId: license.productId,
        licenseKey: license.licenseKey,
        customerName: license.customerName,
        customerEmail: license.customerEmail,
        status: license.status,
        validityDays: license.validityDays,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        maxDomainChanges: license.maxDomainChanges,
        domainChangesUsed: license.domainChangesUsed,
        notes: license.notes,
        createdAt: license.createdAt,
        updatedAt: license.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .where(whereClause)
      .orderBy(sortOrder(sortField))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(license).where(whereClause),
  ]);

  const totalItems = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    licenses: licenses as LicenseTableData[],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// Get single license by ID
export async function getLicenseById(
  id: string
): Promise<ActionResult<LicenseTableData>> {
  try {
    const result = await db
      .select({
        id: license.id,
        productId: license.productId,
        licenseKey: license.licenseKey,
        customerName: license.customerName,
        customerEmail: license.customerEmail,
        status: license.status,
        validityDays: license.validityDays,
        activatedAt: license.activatedAt,
        expiresAt: license.expiresAt,
        maxDomainChanges: license.maxDomainChanges,
        domainChangesUsed: license.domainChangesUsed,
        notes: license.notes,
        createdAt: license.createdAt,
        updatedAt: license.updatedAt,
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
        },
      })
      .from(license)
      .leftJoin(product, eq(license.productId, product.id))
      .where(eq(license.id, id))
      .limit(1);

    if (result.length === 0) {
      return { success: false, message: "License not found" };
    }

    return { success: true, data: result[0] as LicenseTableData };
  } catch (error) {
    console.error("Error fetching license:", error);
    return { success: false, message: "Failed to fetch license" };
  }
}

// Create a new license
export async function createLicense(
  formData: FormData
): Promise<ActionResult<LicenseTableData>> {
  try {
    const rawData = {
      productId: formData.get("productId") as string,
      customerName: (formData.get("customerName") as string) || undefined,
      customerEmail: (formData.get("customerEmail") as string) || undefined,
      status:
        (formData.get("status") as "active" | "expired" | "revoked") ||
        "active",
      validityDays: formData.get("validityDays") as string,
      maxDomainChanges: formData.get("maxDomainChanges") as string,
      notes: (formData.get("notes") as string) || undefined,
    };

    const validatedData = createLicenseSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Verify product exists
    const existingProduct = await db
      .select()
      .from(product)
      .where(eq(product.id, validatedData.data.productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return { success: false, message: "Product not found" };
    }

    // Generate unique license key
    let licenseKey = generateLicenseKey();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db
        .select()
        .from(license)
        .where(eq(license.licenseKey, licenseKey))
        .limit(1);
      if (existing.length === 0) break;
      licenseKey = generateLicenseKey();
      attempts++;
    }

    const newLicense = await db
      .insert(license)
      .values({
        id: crypto.randomUUID(),
        productId: validatedData.data.productId,
        licenseKey,
        customerName: validatedData.data.customerName || null,
        customerEmail: validatedData.data.customerEmail || null,
        status: validatedData.data.status,
        validityDays: validatedData.data.validityDays,
        maxDomainChanges: validatedData.data.maxDomainChanges,
        notes: validatedData.data.notes || null,
      })
      .returning();

    revalidatePath("/admin/licenses");

    return {
      success: true,
      message: "License created successfully",
      data: newLicense[0] as LicenseTableData,
    };
  } catch (error) {
    console.error("Error creating license:", error);
    return { success: false, message: "Failed to create license" };
  }
}

// Update an existing license
export async function updateLicense(
  formData: FormData
): Promise<ActionResult<LicenseTableData>> {
  try {
    const rawData = {
      id: formData.get("id") as string,
      productId: formData.get("productId") as string,
      customerName: (formData.get("customerName") as string) || undefined,
      customerEmail: (formData.get("customerEmail") as string) || undefined,
      status: formData.get("status") as "active" | "expired" | "revoked",
      validityDays: formData.get("validityDays") as string,
      maxDomainChanges: formData.get("maxDomainChanges") as string,
      notes: (formData.get("notes") as string) || undefined,
    };

    const validatedData = updateLicenseSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Verify product exists
    const existingProduct = await db
      .select()
      .from(product)
      .where(eq(product.id, validatedData.data.productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return { success: false, message: "Product not found" };
    }

    const updatedLicense = await db
      .update(license)
      .set({
        productId: validatedData.data.productId,
        customerName: validatedData.data.customerName || null,
        customerEmail: validatedData.data.customerEmail || null,
        status: validatedData.data.status,
        validityDays: validatedData.data.validityDays,
        maxDomainChanges: validatedData.data.maxDomainChanges,
        notes: validatedData.data.notes || null,
      })
      .where(eq(license.id, validatedData.data.id))
      .returning();

    if (updatedLicense.length === 0) {
      return { success: false, message: "License not found" };
    }

    revalidatePath("/admin/licenses");

    return {
      success: true,
      message: "License updated successfully",
      data: updatedLicense[0] as LicenseTableData,
    };
  } catch (error) {
    console.error("Error updating license:", error);
    return { success: false, message: "Failed to update license" };
  }
}

// Delete a license
export async function deleteLicense(id: string): Promise<ActionResult> {
  try {
    const deletedLicense = await db
      .delete(license)
      .where(eq(license.id, id))
      .returning();

    if (deletedLicense.length === 0) {
      return { success: false, message: "License not found" };
    }

    revalidatePath("/admin/licenses");

    return { success: true, message: "License deleted successfully" };
  } catch (error) {
    console.error("Error deleting license:", error);
    return { success: false, message: "Failed to delete license" };
  }
}

// Delete multiple licenses
export async function deleteLicenses(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) {
      return { success: false, message: "No licenses selected" };
    }

    for (const id of ids) {
      await db.delete(license).where(eq(license.id, id));
    }

    revalidatePath("/admin/licenses");

    return {
      success: true,
      message: `${ids.length} license(s) deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting licenses:", error);
    return { success: false, message: "Failed to delete licenses" };
  }
}

// Revoke a license
export async function revokeLicense(id: string): Promise<ActionResult> {
  try {
    const updatedLicense = await db
      .update(license)
      .set({ status: "revoked" })
      .where(eq(license.id, id))
      .returning();

    if (updatedLicense.length === 0) {
      return { success: false, message: "License not found" };
    }

    revalidatePath("/admin/licenses");

    return { success: true, message: "License revoked successfully" };
  } catch (error) {
    console.error("Error revoking license:", error);
    return { success: false, message: "Failed to revoke license" };
  }
}

// Get license statistics
export async function getLicenseStats(): Promise<{
  total: number;
  active: number;
  expired: number;
  revoked: number;
}> {
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

  return {
    total: totalResult[0]?.count ?? 0,
    active: activeResult[0]?.count ?? 0,
    expired: expiredResult[0]?.count ?? 0,
    revoked: revokedResult[0]?.count ?? 0,
  };
}
