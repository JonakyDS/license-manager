"use server";

import { db } from "@/db/drizzle";
import { product, license } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ActionResult,
  ProductTableData,
  ProductFilters,
  PaginationConfig,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// Validation schemas
const createProductSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
  description: z.string().optional(),
  type: z.enum(["plugin", "theme", "source_code", "other"]),
  active: z.boolean().optional().default(true),
});

const updateProductSchema = z.object({
  id: z.string().min(1, "Product ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
  description: z.string().optional(),
  type: z.enum(["plugin", "theme", "source_code", "other"]),
  active: z.boolean().optional(),
});

// Get products with pagination, search, and filters
export async function getProducts(
  filters: ProductFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortColumn: string = "createdAt",
  sortDirection: "asc" | "desc" = "desc"
): Promise<{
  products: ProductTableData[];
  pagination: PaginationConfig;
}> {
  const offset = (page - 1) * pageSize;

  // Build where conditions
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
    conditions.push(
      eq(
        product.type,
        filters.type as "plugin" | "theme" | "source_code" | "other"
      )
    );
  }

  if (filters.status === "active") {
    conditions.push(eq(product.active, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(product.active, false));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get sort order
  const sortOrder = sortDirection === "asc" ? asc : desc;
  const sortField =
    sortColumn === "name"
      ? product.name
      : sortColumn === "slug"
        ? product.slug
        : sortColumn === "type"
          ? product.type
          : sortColumn === "active"
            ? product.active
            : product.createdAt;

  // Execute queries using relational API
  const [products, totalResult] = await Promise.all([
    db.query.product.findMany({
      where: whereClause,
      orderBy: sortOrder(sortField),
      limit: pageSize,
      offset: offset,
      with: {
        licenses: {
          columns: { id: true },
        },
      },
    }),
    db.select({ count: count() }).from(product).where(whereClause),
  ]);

  const productsWithCounts = products.map((p) => ({
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
  }));

  const totalItems = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    products: productsWithCounts as ProductTableData[],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// Get all products for dropdown selection
export async function getAllProducts(): Promise<
  { id: string; name: string; slug: string }[]
> {
  const products = await db.query.product.findMany({
    where: eq(product.active, true),
    orderBy: asc(product.name),
    columns: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return products;
}

// Get single product by ID
export async function getProductById(
  id: string
): Promise<ActionResult<ProductTableData>> {
  try {
    const result = await db.query.product.findFirst({
      where: eq(product.id, id),
    });

    if (!result) {
      return { success: false, message: "Product not found" };
    }

    return { success: true, data: result as ProductTableData };
  } catch (error) {
    console.error("Error fetching product:", error);
    return { success: false, message: "Failed to fetch product" };
  }
}

// Create a new product
export async function createProduct(
  formData: FormData
): Promise<ActionResult<ProductTableData>> {
  try {
    const rawData = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: (formData.get("description") as string) || undefined,
      type: formData.get("type") as
        | "plugin"
        | "theme"
        | "source_code"
        | "other",
      active: formData.get("active") === "true",
    };

    const validatedData = createProductSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Check if slug already exists
    const existingProduct = await db.query.product.findFirst({
      where: eq(product.slug, validatedData.data.slug),
    });

    if (existingProduct) {
      return {
        success: false,
        message: "A product with this slug already exists",
      };
    }

    const newProduct = await db
      .insert(product)
      .values({
        id: crypto.randomUUID(),
        name: validatedData.data.name,
        slug: validatedData.data.slug,
        description: validatedData.data.description || null,
        type: validatedData.data.type,
        active: validatedData.data.active,
      })
      .returning();

    revalidatePath("/admin/products");

    return {
      success: true,
      message: "Product created successfully",
      data: newProduct[0] as ProductTableData,
    };
  } catch (error) {
    console.error("Error creating product:", error);
    return { success: false, message: "Failed to create product" };
  }
}

// Update an existing product
export async function updateProduct(
  formData: FormData
): Promise<ActionResult<ProductTableData>> {
  try {
    const rawData = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      description: (formData.get("description") as string) || undefined,
      type: formData.get("type") as
        | "plugin"
        | "theme"
        | "source_code"
        | "other",
      active: formData.get("active") === "true",
    };

    const validatedData = updateProductSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Check if slug is taken by another product
    const existingProduct = await db.query.product.findFirst({
      where: and(
        eq(product.slug, validatedData.data.slug),
        sql`${product.id} != ${validatedData.data.id}`
      ),
    });

    if (existingProduct) {
      return {
        success: false,
        message: "A product with this slug already exists",
      };
    }

    const updatedProduct = await db
      .update(product)
      .set({
        name: validatedData.data.name,
        slug: validatedData.data.slug,
        description: validatedData.data.description || null,
        type: validatedData.data.type,
        active: validatedData.data.active,
      })
      .where(eq(product.id, validatedData.data.id))
      .returning();

    if (updatedProduct.length === 0) {
      return { success: false, message: "Product not found" };
    }

    revalidatePath("/admin/products");

    return {
      success: true,
      message: "Product updated successfully",
      data: updatedProduct[0] as ProductTableData,
    };
  } catch (error) {
    console.error("Error updating product:", error);
    return { success: false, message: "Failed to update product" };
  }
}

// Delete a product
export async function deleteProduct(id: string): Promise<ActionResult> {
  try {
    // Check if product has licenses
    const licenseCount = await db
      .select({ count: count() })
      .from(license)
      .where(eq(license.productId, id));

    if ((licenseCount[0]?.count ?? 0) > 0) {
      return {
        success: false,
        message:
          "Cannot delete product with existing licenses. Please delete or reassign licenses first.",
      };
    }

    const deletedProduct = await db
      .delete(product)
      .where(eq(product.id, id))
      .returning();

    if (deletedProduct.length === 0) {
      return { success: false, message: "Product not found" };
    }

    revalidatePath("/admin/products");

    return { success: true, message: "Product deleted successfully" };
  } catch (error) {
    console.error("Error deleting product:", error);
    return { success: false, message: "Failed to delete product" };
  }
}

// Delete multiple products
export async function deleteProducts(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) {
      return { success: false, message: "No products selected" };
    }

    // Check if any products have licenses
    const licenseCount = await db
      .select({ count: count() })
      .from(license)
      .where(
        sql`${license.productId} IN (${sql.join(
          ids.map((id) => sql`${id}`),
          sql`, `
        )})`
      );

    if ((licenseCount[0]?.count ?? 0) > 0) {
      return {
        success: false,
        message:
          "Cannot delete products with existing licenses. Please delete or reassign licenses first.",
      };
    }

    for (const id of ids) {
      await db.delete(product).where(eq(product.id, id));
    }

    revalidatePath("/admin/products");

    return {
      success: true,
      message: `${ids.length} product(s) deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting products:", error);
    return { success: false, message: "Failed to delete products" };
  }
}

// Get product statistics
export async function getProductStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byType: Record<string, number>;
}> {
  const [totalResult, activeResult, typeResults] = await Promise.all([
    db.select({ count: count() }).from(product),
    db.select({ count: count() }).from(product).where(eq(product.active, true)),
    db
      .select({
        type: product.type,
        count: count(),
      })
      .from(product)
      .groupBy(product.type),
  ]);

  const total = totalResult[0]?.count ?? 0;
  const active = activeResult[0]?.count ?? 0;
  const byType = Object.fromEntries(typeResults.map((r) => [r.type, r.count]));

  return {
    total,
    active,
    inactive: total - active,
    byType,
  };
}
