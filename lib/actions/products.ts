"use server";

/**
 * Product Management Server Actions
 *
 * Provides CRUD operations for product management in the admin panel.
 * All actions require admin authentication.
 */

import { db } from "@/db/drizzle";
import { product, license } from "@/db/schema";
import {
  eq,
  ilike,
  or,
  count,
  desc,
  asc,
  and,
  sql,
  inArray,
} from "drizzle-orm";
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
  getBooleanField,
  generateId,
} from "./utils";
import { productSchema, type ProductType } from "@/lib/validations/admin";
import type {
  ActionResult,
  ProductTableData,
  ProductFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/products";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for product queries
 */
function getProductSortField(sortColumn: string) {
  switch (sortColumn) {
    case "name":
      return product.name;
    case "slug":
      return product.slug;
    case "type":
      return product.type;
    case "active":
      return product.active;
    default:
      return product.createdAt;
  }
}

/**
 * Builds where conditions for product queries
 */
function buildProductWhereConditions(filters: ProductFilters) {
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(product.name, `%${filters.search}%`),
        ilike(product.slug, `%${filters.search}%`),
        ilike(product.description, `%${filters.search}%`)
      )
    );
  }

  if (filters.type && filters.type !== "all") {
    conditions.push(eq(product.type, filters.type as ProductType));
  }

  if (filters.status === "active") {
    conditions.push(eq(product.active, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(product.active, false));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Transforms raw product with licenses to ProductTableData
 */
function transformProductWithLicenseCount(
  p: typeof product.$inferSelect & { licenses: { id: string }[] }
): ProductTableData {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    type: p.type,
    active: p.active,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    _count: {
      licenses: p.licenses.length,
    },
  };
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Retrieves paginated list of products with filtering and sorting
 */
export async function getProducts(
  filters: ProductFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortColumn = "createdAt",
  sortDirection: SortDirection = "desc"
): Promise<
  ActionResult<{ products: ProductTableData[]; pagination: PaginationConfig }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const whereClause = buildProductWhereConditions(filters);
    const sortOrder = sortDirection === "asc" ? asc : desc;
    const sortField = getProductSortField(sortColumn);

    const [products, totalResult] = await Promise.all([
      db.query.product.findMany({
        where: whereClause,
        orderBy: sortOrder(sortField),
        limit: pageSize,
        offset: calculateOffset(page, pageSize),
        with: {
          licenses: { columns: { id: true } },
        },
      }),
      db.select({ count: count() }).from(product).where(whereClause),
    ]);

    const totalItems = totalResult[0]?.count ?? 0;
    const productsWithCounts = products.map(transformProductWithLicenseCount);

    return success({
      products: productsWithCounts,
      pagination: calculatePagination(page, pageSize, totalItems),
    });
  }, "Failed to fetch products");
}

/**
 * Retrieves all active products for dropdown selection
 */
export async function getAllProducts(): Promise<
  ActionResult<{ id: string; name: string; slug: string }[]>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const products = await db.query.product.findMany({
      where: eq(product.active, true),
      orderBy: asc(product.name),
      columns: {
        id: true,
        name: true,
        slug: true,
      },
    });

    return success(products);
  }, "Failed to fetch products");
}

/**
 * Retrieves a single product by ID
 */
export async function getProductById(
  id: string
): Promise<ActionResult<ProductTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const result = await db.query.product.findFirst({
      where: eq(product.id, id),
    });

    if (!result) return notFound("Product");

    return success(result as ProductTableData);
  }, "Failed to fetch product");
}

/**
 * Gets aggregated product statistics
 */
export async function getProductStats(): Promise<
  ActionResult<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [totalResult, activeResult, typeResults] = await Promise.all([
      db.select({ count: count() }).from(product),
      db
        .select({ count: count() })
        .from(product)
        .where(eq(product.active, true)),
      db
        .select({ type: product.type, count: count() })
        .from(product)
        .groupBy(product.type),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const active = activeResult[0]?.count ?? 0;
    const byType = Object.fromEntries(
      typeResults.map((r) => [r.type, r.count])
    );

    return success({
      total,
      active,
      inactive: total - active,
      byType,
    });
  }, "Failed to fetch product statistics");
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Creates a new product
 */
export async function createProduct(
  formData: FormData
): Promise<ActionResult<ProductTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      name: getFormField(formData, "name"),
      slug: getFormField(formData, "slug"),
      description: getOptionalField(formData, "description"),
      type: getFormField(formData, "type") as ProductType,
      active: getBooleanField(formData, "active"),
    };

    const validated = productSchema.create.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Check for existing slug
    const existingProduct = await db.query.product.findFirst({
      where: eq(product.slug, validated.data.slug),
    });

    if (existingProduct) {
      return failure("A product with this slug already exists");
    }

    const [newProduct] = await db
      .insert(product)
      .values({
        id: generateId(),
        name: validated.data.name,
        slug: validated.data.slug,
        description: validated.data.description ?? null,
        type: validated.data.type,
        active: validated.data.active,
      })
      .returning();

    revalidatePath(REVALIDATION_PATH);

    return success(
      newProduct as ProductTableData,
      "Product created successfully"
    );
  }, "Failed to create product");
}

/**
 * Updates an existing product
 */
export async function updateProduct(
  formData: FormData
): Promise<ActionResult<ProductTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      id: getFormField(formData, "id"),
      name: getFormField(formData, "name"),
      slug: getFormField(formData, "slug"),
      description: getOptionalField(formData, "description"),
      type: getFormField(formData, "type") as ProductType,
      active: getBooleanField(formData, "active"),
    };

    const validated = productSchema.update.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Check if slug is taken by another product
    const existingProduct = await db.query.product.findFirst({
      where: and(
        eq(product.slug, validated.data.slug),
        sql`${product.id} != ${validated.data.id}`
      ),
    });

    if (existingProduct) {
      return failure("A product with this slug already exists");
    }

    const [updatedProduct] = await db
      .update(product)
      .set({
        name: validated.data.name,
        slug: validated.data.slug,
        description: validated.data.description ?? null,
        type: validated.data.type,
        active: validated.data.active,
      })
      .where(eq(product.id, validated.data.id))
      .returning();

    if (!updatedProduct) return notFound("Product");

    revalidatePath(REVALIDATION_PATH);

    return success(
      updatedProduct as ProductTableData,
      "Product updated successfully"
    );
  }, "Failed to update product");
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Checks if products have associated licenses
 */
async function hasAssociatedLicenses(productIds: string[]): Promise<boolean> {
  const result = await db
    .select({ count: count() })
    .from(license)
    .where(inArray(license.productId, productIds));

  return (result[0]?.count ?? 0) > 0;
}

/**
 * Deletes a single product by ID
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    if (await hasAssociatedLicenses([id])) {
      return failure(
        "Cannot delete product with existing licenses. Please delete or reassign licenses first."
      );
    }

    const [deletedProduct] = await db
      .delete(product)
      .where(eq(product.id, id))
      .returning();

    if (!deletedProduct) return notFound("Product");

    revalidatePath(REVALIDATION_PATH);

    return ok("Product deleted successfully");
  }, "Failed to delete product");
}

/**
 * Deletes multiple products by IDs
 */
export async function deleteProducts(ids: string[]): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No products selected");
    }

    if (await hasAssociatedLicenses(ids)) {
      return failure(
        "Cannot delete products with existing licenses. Please delete or reassign licenses first."
      );
    }

    await db.delete(product).where(inArray(product.id, ids));

    revalidatePath(REVALIDATION_PATH);

    return ok(`${ids.length} product(s) deleted successfully`);
  }, "Failed to delete products");
}
