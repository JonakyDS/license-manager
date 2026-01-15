"use server";

/**
 * Price Management Server Actions
 *
 * Provides CRUD operations for price management in the admin panel.
 * Prices are linked to Stripe and used for subscription billing.
 */

import { db } from "@/db/drizzle";
import { price, product } from "@/db/schema";
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
  generateId,
  getFormField,
  getOptionalField,
  getBooleanField,
} from "./utils";
import { priceSchema, type PriceType } from "@/lib/validations/admin";
import type {
  ActionResult,
  PriceTableData,
  PriceFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import { createStripePrice, createStripeProduct, stripe } from "@/lib/stripe";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/prices";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for price queries
 */
function getPriceSortField(sortColumn: string) {
  switch (sortColumn) {
    case "unitAmount":
      return price.unitAmount;
    case "type":
      return price.type;
    case "currency":
      return price.currency;
    default:
      return price.createdAt;
  }
}

/**
 * Builds where conditions for price queries
 */
function buildPriceWhereConditions(filters: PriceFilters) {
  const conditions = [];

  if (filters.productId && filters.productId !== "all") {
    conditions.push(eq(price.productId, filters.productId));
  }

  if (filters.type && filters.type !== "all") {
    conditions.push(eq(price.type, filters.type as PriceType));
  }

  if (filters.status === "active") {
    conditions.push(eq(price.active, true));
  } else if (filters.status === "inactive") {
    conditions.push(eq(price.active, false));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// =============================================================================
// LIST PRICES
// =============================================================================

export async function getPrices(params: {
  filters?: PriceFilters;
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
}): Promise<
  ActionResult<{
    prices: PriceTableData[];
    pagination: PaginationConfig;
  }>
> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const {
      filters = {},
      page = 1,
      pageSize = DEFAULT_PAGE_SIZE,
      sortColumn = "createdAt",
      sortDirection = "desc",
    } = params;

    const whereConditions = buildPriceWhereConditions(filters);
    const sortField = getPriceSortField(sortColumn);
    const orderFn = sortDirection === "asc" ? asc : desc;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(price)
      .where(whereConditions);

    // Get paginated prices with relations
    const prices = await db.query.price.findMany({
      where: whereConditions,
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: orderFn(sortField),
      limit: pageSize,
      offset: calculateOffset(page, pageSize),
    });

    return success({
      prices: prices as PriceTableData[],
      pagination: calculatePagination(page, pageSize, total),
    });
  }, "Failed to fetch prices");
}

// =============================================================================
// GET PRICE BY ID
// =============================================================================

export async function getPriceById(
  id: string
): Promise<ActionResult<PriceTableData>> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const result = await db.query.price.findFirst({
      where: eq(price.id, id),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!result) {
      return notFound("Price");
    }

    return success(result as PriceTableData);
  }, "Failed to fetch price");
}

// =============================================================================
// CREATE PRICE
// =============================================================================

export async function createPrice(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const rawData = {
      productId: getFormField(formData, "productId"),
      type: getFormField(formData, "type"),
      currency: getFormField(formData, "currency") || "usd",
      unitAmount: getFormField(formData, "unitAmount"),
      interval: getOptionalField(formData, "interval"),
      intervalCount: getOptionalField(formData, "intervalCount"),
      trialPeriodDays: getOptionalField(formData, "trialPeriodDays"),
      active: getBooleanField(formData, "active"),
    };

    const parsed = priceSchema.create.safeParse(rawData);
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const data = parsed.data;

    // Verify product exists
    const existingProduct = await db.query.product.findFirst({
      where: eq(product.id, data.productId),
    });

    if (!existingProduct) {
      return notFound("Product");
    }

    // Create Stripe product if not exists
    let stripeProductId = existingProduct.stripeProductId;
    if (!stripeProductId) {
      const stripeProduct = await createStripeProduct({
        name: existingProduct.name,
        description: existingProduct.description ?? undefined,
        metadata: {
          productId: existingProduct.id,
        },
      });
      stripeProductId = stripeProduct.id;

      // Update product with Stripe ID
      await db
        .update(product)
        .set({ stripeProductId })
        .where(eq(product.id, existingProduct.id));
    }

    // Create Stripe price
    const stripePrice = await createStripePrice({
      productId: stripeProductId,
      unitAmount: data.unitAmount,
      currency: data.currency,
      recurring:
        data.type === "recurring" && data.interval
          ? {
              interval: data.interval,
              intervalCount: data.intervalCount,
            }
          : undefined,
      metadata: {
        productId: existingProduct.id,
      },
    });

    // Create price in database
    await db.insert(price).values({
      id: generateId(),
      productId: data.productId,
      stripePriceId: stripePrice.id,
      type: data.type,
      active: data.active ?? true,
      currency: data.currency,
      unitAmount: data.unitAmount,
      interval: data.type === "recurring" ? (data.interval ?? null) : null,
      intervalCount:
        data.type === "recurring" ? (data.intervalCount ?? 1) : null,
      trialPeriodDays: data.trialPeriodDays ?? null,
    });

    revalidatePath(REVALIDATION_PATH);
    return ok("Price created successfully");
  }, "Failed to create price");
}

// =============================================================================
// UPDATE PRICE (LIMITED - only active status)
// =============================================================================

export async function updatePrice(formData: FormData): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const id = getFormField(formData, "id");
    const active = getBooleanField(formData, "active");

    const parsed = priceSchema.update.safeParse({ id, active });
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const existingPrice = await db.query.price.findFirst({
      where: eq(price.id, id),
    });

    if (!existingPrice) {
      return notFound("Price");
    }

    // Update in Stripe
    await stripe.prices.update(existingPrice.stripePriceId, {
      active: parsed.data.active,
    });

    // Update in database
    await db
      .update(price)
      .set({ active: parsed.data.active })
      .where(eq(price.id, id));

    revalidatePath(REVALIDATION_PATH);
    return ok("Price updated successfully");
  }, "Failed to update price");
}

// =============================================================================
// DELETE PRICE (ARCHIVE)
// =============================================================================

export async function deletePrice(id: string): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const existingPrice = await db.query.price.findFirst({
      where: eq(price.id, id),
    });

    if (!existingPrice) {
      return notFound("Price");
    }

    // Archive in Stripe (prices cannot be deleted)
    await stripe.prices.update(existingPrice.stripePriceId, {
      active: false,
    });

    // Delete from database
    await db.delete(price).where(eq(price.id, id));

    revalidatePath(REVALIDATION_PATH);
    return ok("Price deleted successfully");
  }, "Failed to delete price");
}

// =============================================================================
// BULK DELETE PRICES
// =============================================================================

export async function bulkDeletePrices(ids: string[]): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No prices selected");
    }

    // Get prices to archive in Stripe
    const pricesToDelete = await db.query.price.findMany({
      where: inArray(price.id, ids),
    });

    // Archive in Stripe
    await Promise.all(
      pricesToDelete.map((p) =>
        stripe.prices.update(p.stripePriceId, { active: false })
      )
    );

    // Delete from database
    await db.delete(price).where(inArray(price.id, ids));

    revalidatePath(REVALIDATION_PATH);
    return ok(`${ids.length} price(s) deleted`);
  }, "Failed to delete prices");
}

// =============================================================================
// PUBLIC: GET PRODUCT PRICES
// =============================================================================

export async function getProductPrices(
  productId: string
): Promise<ActionResult<PriceTableData[]>> {
  return withErrorHandling(async () => {
    const prices = await db.query.price.findMany({
      where: and(eq(price.productId, productId), eq(price.active, true)),
      with: {
        product: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: asc(price.unitAmount),
    });

    return success(prices as PriceTableData[]);
  }, "Failed to fetch product prices");
}

// =============================================================================
// TOGGLE PRICE STATUS
// =============================================================================

export async function togglePriceStatus(
  id: string,
  active: boolean
): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const existingPrice = await db.query.price.findFirst({
      where: eq(price.id, id),
    });

    if (!existingPrice) {
      return notFound("Price");
    }

    // Update in Stripe
    await stripe.prices.update(existingPrice.stripePriceId, {
      active,
    });

    // Update in database
    await db.update(price).set({ active }).where(eq(price.id, id));

    revalidatePath(REVALIDATION_PATH);
    return ok(`Price ${active ? "activated" : "deactivated"} successfully`);
  }, "Failed to toggle price status");
}
