"use server";

/**
 * Subscription Management Server Actions
 *
 * Provides operations for subscription management in the admin panel
 * and user dashboard. Handles both admin and user-level operations.
 */

import { db } from "@/db/drizzle";
import { subscription, price, product, user } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin, getCurrentUser } from "./auth";
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
} from "./utils";
import {
  subscriptionSchema,
  type SubscriptionStatus,
} from "@/lib/validations/admin";
import type {
  ActionResult,
  SubscriptionTableData,
  SubscriptionFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import {
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  cancelSubscriptionImmediately,
} from "@/lib/stripe";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/subscriptions";
const USER_REVALIDATION_PATH = "/dashboard";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for subscription queries
 */
function getSubscriptionSortField(sortColumn: string) {
  switch (sortColumn) {
    case "status":
      return subscription.status;
    case "currentPeriodEnd":
      return subscription.currentPeriodEnd;
    case "currentPeriodStart":
      return subscription.currentPeriodStart;
    default:
      return subscription.createdAt;
  }
}

/**
 * Builds where conditions for subscription queries
 */
function buildSubscriptionWhereConditions(filters: SubscriptionFilters) {
  const conditions = [];

  if (filters.status && filters.status !== "all") {
    conditions.push(
      eq(subscription.status, filters.status as SubscriptionStatus)
    );
  }

  if (filters.userId && filters.userId !== "all") {
    conditions.push(eq(subscription.userId, filters.userId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// =============================================================================
// ADMIN: LIST SUBSCRIPTIONS
// =============================================================================

export async function getSubscriptions(params: {
  filters?: SubscriptionFilters;
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortDirection?: SortDirection;
}): Promise<
  ActionResult<{
    subscriptions: SubscriptionTableData[];
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

    const whereConditions = buildSubscriptionWhereConditions(filters);
    const sortField = getSubscriptionSortField(sortColumn);
    const orderFn = sortDirection === "asc" ? asc : desc;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(subscription)
      .where(whereConditions);

    // Get paginated subscriptions with relations
    const subscriptions = await db.query.subscription.findMany({
      where: whereConditions,
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        price: {
          columns: {
            id: true,
            unitAmount: true,
            currency: true,
            interval: true,
          },
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: orderFn(sortField),
      limit: pageSize,
      offset: calculateOffset(page, pageSize),
    });

    return success({
      subscriptions: subscriptions as SubscriptionTableData[],
      pagination: calculatePagination(page, pageSize, total),
    });
  }, "Failed to fetch subscriptions");
}

// =============================================================================
// ADMIN: GET SUBSCRIPTION BY ID
// =============================================================================

export async function getSubscriptionById(
  id: string
): Promise<ActionResult<SubscriptionTableData>> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const result = await db.query.subscription.findFirst({
      where: eq(subscription.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        price: {
          columns: {
            id: true,
            unitAmount: true,
            currency: true,
            interval: true,
          },
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      return notFound("Subscription");
    }

    return success(result as SubscriptionTableData);
  }, "Failed to fetch subscription");
}

// =============================================================================
// ADMIN: CANCEL SUBSCRIPTION
// =============================================================================

export async function adminCancelSubscription(
  formData: FormData
): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const id = formData.get("id") as string;
    const immediate = formData.get("immediate") === "true";

    const parsed = subscriptionSchema.cancel.safeParse({ id, immediate });
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const existingSubscription = await db.query.subscription.findFirst({
      where: eq(subscription.id, id),
    });

    if (!existingSubscription) {
      return notFound("Subscription");
    }

    // Cancel in Stripe
    if (immediate) {
      await cancelSubscriptionImmediately(
        existingSubscription.stripeSubscriptionId
      );
      await db
        .update(subscription)
        .set({
          status: "canceled",
          canceledAt: new Date(),
          endedAt: new Date(),
        })
        .where(eq(subscription.id, id));
    } else {
      await cancelSubscriptionAtPeriodEnd(
        existingSubscription.stripeSubscriptionId
      );
      await db
        .update(subscription)
        .set({
          cancelAtPeriodEnd: true,
        })
        .where(eq(subscription.id, id));
    }

    revalidatePath(REVALIDATION_PATH);
    return ok(
      immediate
        ? "Subscription canceled immediately"
        : "Subscription will cancel at period end"
    );
  }, "Failed to cancel subscription");
}

// =============================================================================
// ADMIN: RESUME SUBSCRIPTION
// =============================================================================

export async function adminResumeSubscription(
  formData: FormData
): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    const id = formData.get("id") as string;

    const parsed = subscriptionSchema.resume.safeParse({ id });
    if (!parsed.success) {
      return validationError(parsed.error.flatten().fieldErrors);
    }

    const existingSubscription = await db.query.subscription.findFirst({
      where: eq(subscription.id, id),
    });

    if (!existingSubscription) {
      return notFound("Subscription");
    }

    if (!existingSubscription.cancelAtPeriodEnd) {
      return failure("Subscription is not scheduled for cancellation");
    }

    // Resume in Stripe
    await resumeSubscription(existingSubscription.stripeSubscriptionId);

    await db
      .update(subscription)
      .set({
        cancelAtPeriodEnd: false,
      })
      .where(eq(subscription.id, id));

    revalidatePath(REVALIDATION_PATH);
    return ok("Subscription resumed");
  }, "Failed to resume subscription");
}

// =============================================================================
// ADMIN: BULK DELETE SUBSCRIPTIONS
// =============================================================================

export async function bulkDeleteSubscriptions(
  ids: string[]
): Promise<ActionResult> {
  const adminResult = await requireAdmin();
  if (!adminResult.success) return adminResult;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No subscriptions selected");
    }

    // Note: This only deletes from database. Stripe subscriptions
    // should be canceled separately if needed.
    await db.delete(subscription).where(inArray(subscription.id, ids));

    revalidatePath(REVALIDATION_PATH);
    return ok(`${ids.length} subscription(s) deleted`);
  }, "Failed to delete subscriptions");
}

// =============================================================================
// USER: GET MY SUBSCRIPTIONS
// =============================================================================

export async function getMySubscriptions(): Promise<
  ActionResult<SubscriptionTableData[]>
> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return failure("Authentication required");
  }

  return withErrorHandling(async () => {
    const subscriptions = await db.query.subscription.findMany({
      where: eq(subscription.userId, currentUser.id),
      with: {
        price: {
          columns: {
            id: true,
            unitAmount: true,
            currency: true,
            interval: true,
          },
          with: {
            product: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: desc(subscription.createdAt),
    });

    return success(subscriptions as SubscriptionTableData[]);
  }, "Failed to fetch subscriptions");
}

// =============================================================================
// USER: CANCEL MY SUBSCRIPTION
// =============================================================================

export async function cancelMySubscription(
  subscriptionId: string
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return failure("Authentication required");
  }

  return withErrorHandling(async () => {
    const existingSubscription = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.id, subscriptionId),
        eq(subscription.userId, currentUser.id)
      ),
    });

    if (!existingSubscription) {
      return notFound("Subscription");
    }

    if (existingSubscription.status === "canceled") {
      return failure("Subscription is already canceled");
    }

    // Cancel at period end (not immediately)
    await cancelSubscriptionAtPeriodEnd(
      existingSubscription.stripeSubscriptionId
    );

    await db
      .update(subscription)
      .set({
        cancelAtPeriodEnd: true,
      })
      .where(eq(subscription.id, subscriptionId));

    revalidatePath(USER_REVALIDATION_PATH);
    return ok("Subscription will be canceled at the end of the billing period");
  }, "Failed to cancel subscription");
}

// =============================================================================
// USER: RESUME MY SUBSCRIPTION
// =============================================================================

export async function resumeMySubscription(
  subscriptionId: string
): Promise<ActionResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return failure("Authentication required");
  }

  return withErrorHandling(async () => {
    const existingSubscription = await db.query.subscription.findFirst({
      where: and(
        eq(subscription.id, subscriptionId),
        eq(subscription.userId, currentUser.id)
      ),
    });

    if (!existingSubscription) {
      return notFound("Subscription");
    }

    if (!existingSubscription.cancelAtPeriodEnd) {
      return failure("Subscription is not scheduled for cancellation");
    }

    // Resume in Stripe
    await resumeSubscription(existingSubscription.stripeSubscriptionId);

    await db
      .update(subscription)
      .set({
        cancelAtPeriodEnd: false,
      })
      .where(eq(subscription.id, subscriptionId));

    revalidatePath(USER_REVALIDATION_PATH);
    return ok("Subscription resumed");
  }, "Failed to resume subscription");
}

// =============================================================================
// HELPER: CHECK USER HAS ACTIVE SUBSCRIPTION
// =============================================================================

export async function hasActiveSubscription(
  userId: string,
  productId?: string
): Promise<boolean> {
  const query = productId
    ? db.query.subscription.findFirst({
        where: and(
          eq(subscription.userId, userId),
          eq(subscription.status, "active")
        ),
        with: {
          price: {
            columns: { productId: true },
          },
        },
      })
    : db.query.subscription.findFirst({
        where: and(
          eq(subscription.userId, userId),
          eq(subscription.status, "active")
        ),
      });

  const result = await query;

  if (!result) return false;

  if (productId && "price" in result && result.price) {
    const priceData = result.price as { productId: string };
    return priceData.productId === productId;
  }

  return true;
}

// =============================================================================
// HELPER: GET ACTIVE SUBSCRIPTION FOR USER
// =============================================================================

export async function getActiveSubscription(
  userId: string,
  productId?: string
): Promise<SubscriptionTableData | null> {
  const subscriptions = await db.query.subscription.findMany({
    where: and(
      eq(subscription.userId, userId),
      or(eq(subscription.status, "active"), eq(subscription.status, "trialing"))
    ),
    with: {
      price: {
        columns: {
          id: true,
          unitAmount: true,
          currency: true,
          interval: true,
          productId: true,
        },
        with: {
          product: {
            columns: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
    orderBy: desc(subscription.createdAt),
  });

  if (subscriptions.length === 0) return null;

  if (productId) {
    const found = subscriptions.find(
      (sub) => (sub.price as { productId: string })?.productId === productId
    );
    return (found as SubscriptionTableData) ?? null;
  }

  return subscriptions[0] as SubscriptionTableData;
}
