/**
 * Stripe Synchronization Actions
 *
 * Reconciles subscription data between Stripe and local database.
 * Use this to recover from missed webhooks or initial sync.
 */

import { db } from "@/db/drizzle";
import { user, subscription, price, product } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import {
  stripe,
  mapStripeSubscriptionStatus,
  mapStripePriceInterval,
} from "@/lib/stripe";
import type Stripe from "stripe";

export interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

/**
 * Syncs all subscriptions from Stripe to the local database.
 * This handles cases where webhooks were missed or misconfigured.
 */
export async function syncAllSubscriptions(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  console.log("Starting full subscription sync from Stripe...");

  try {
    // Iterate through ALL Stripe subscriptions
    for await (const stripeSubscription of stripe.subscriptions.list({
      status: "all",
      expand: ["data.items.data.price.product", "data.customer"],
      limit: 100,
    })) {
      try {
        await syncSingleSubscription(stripeSubscription, result);
        result.synced++;
      } catch (error) {
        const errorMsg = `Failed to sync subscription ${stripeSubscription.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }

    console.log(
      `Sync complete. Synced: ${result.synced}, Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors.length}`
    );
  } catch (error) {
    console.error("Fatal error during sync:", error);
    result.errors.push(`Fatal error: ${error}`);
  }

  return result;
}

/**
 * Syncs subscriptions for a specific user by their Stripe Customer ID
 */
export async function syncUserSubscriptions(
  stripeCustomerId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  console.log(`Syncing subscriptions for customer: ${stripeCustomerId}`);

  try {
    for await (const stripeSubscription of stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "all",
      expand: ["data.items.data.price.product", "data.customer"],
    })) {
      try {
        await syncSingleSubscription(stripeSubscription, result);
        result.synced++;
      } catch (error) {
        const errorMsg = `Failed to sync subscription ${stripeSubscription.id}: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }
    }
  } catch (error) {
    console.error("Error syncing user subscriptions:", error);
    result.errors.push(`Error: ${error}`);
  }

  return result;
}

/**
 * Syncs subscriptions for all users who have a Stripe Customer ID
 */
export async function syncSubscriptionsForAllUsers(): Promise<SyncResult> {
  const result: SyncResult = {
    synced: 0,
    created: 0,
    updated: 0,
    errors: [],
  };

  console.log(
    "Syncing subscriptions for all users with Stripe Customer IDs..."
  );

  // Get all users with Stripe customer IDs
  const usersWithStripe = await db.query.user.findMany({
    where: isNotNull(user.stripeCustomerId),
  });

  console.log(`Found ${usersWithStripe.length} users with Stripe Customer IDs`);

  for (const dbUser of usersWithStripe) {
    if (!dbUser.stripeCustomerId) continue;

    const userResult = await syncUserSubscriptions(dbUser.stripeCustomerId);
    result.synced += userResult.synced;
    result.created += userResult.created;
    result.updated += userResult.updated;
    result.errors.push(...userResult.errors);
  }

  return result;
}

/**
 * Internal helper to sync a single subscription
 */
async function syncSingleSubscription(
  stripeSubscription: Stripe.Subscription,
  result: SyncResult
): Promise<void> {
  const customer = stripeSubscription.customer as Stripe.Customer;
  const customerId =
    typeof stripeSubscription.customer === "string"
      ? stripeSubscription.customer
      : customer.id;

  // Find user by Stripe customer ID
  let dbUser = await db.query.user.findFirst({
    where: eq(user.stripeCustomerId, customerId),
  });

  // If user not found by customer ID, try to find by email and link them
  if (!dbUser && customer.email) {
    dbUser = await db.query.user.findFirst({
      where: eq(user.email, customer.email),
    });

    // Link the Stripe customer ID to the user
    if (dbUser) {
      await db
        .update(user)
        .set({ stripeCustomerId: customerId })
        .where(eq(user.id, dbUser.id));
      console.log(`Linked Stripe customer ${customerId} to user ${dbUser.id}`);
    }
  }

  if (!dbUser) {
    throw new Error(
      `No user found for Stripe customer ${customerId} (email: ${customer.email})`
    );
  }

  // Get subscription item details
  const subscriptionItem = stripeSubscription.items.data[0];
  if (!subscriptionItem) {
    throw new Error("No subscription items found");
  }

  const stripePrice = subscriptionItem.price;
  const stripeProduct = stripePrice.product as Stripe.Product;

  // Ensure product exists
  let dbProduct = await db.query.product.findFirst({
    where: eq(product.stripeProductId, stripeProduct.id),
  });

  if (!dbProduct) {
    const [newProduct] = await db
      .insert(product)
      .values({
        id: crypto.randomUUID(),
        name: stripeProduct.name,
        slug: stripeProduct.name.toLowerCase().replace(/\s+/g, "-"),
        description: stripeProduct.description ?? null,
        type: "plugin",
        stripeProductId: stripeProduct.id,
        active: stripeProduct.active,
      })
      .returning();
    dbProduct = newProduct;
    console.log(`Created product: ${dbProduct.name}`);
  }

  // Ensure price exists
  let dbPrice = await db.query.price.findFirst({
    where: eq(price.stripePriceId, stripePrice.id),
  });

  if (!dbPrice) {
    const [newPrice] = await db
      .insert(price)
      .values({
        id: crypto.randomUUID(),
        productId: dbProduct.id,
        stripePriceId: stripePrice.id,
        type: stripePrice.type === "recurring" ? "recurring" : "one_time",
        active: stripePrice.active,
        currency: stripePrice.currency,
        unitAmount: stripePrice.unit_amount ?? 0,
        interval: mapStripePriceInterval(stripePrice.recurring?.interval),
        intervalCount: stripePrice.recurring?.interval_count ?? 1,
        trialPeriodDays: stripePrice.recurring?.trial_period_days ?? null,
      })
      .returning();
    dbPrice = newPrice;
    console.log(`Created price: ${dbPrice.id}`);
  }

  // Check if subscription exists
  const existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, stripeSubscription.id),
  });

  // Get period dates
  const currentItem = stripeSubscription.items.data[0];
  const currentPeriodStart = currentItem?.current_period_start
    ? new Date(currentItem.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = currentItem?.current_period_end
    ? new Date(currentItem.current_period_end * 1000)
    : new Date();

  const subscriptionData = {
    userId: dbUser.id,
    priceId: dbPrice.id,
    stripeSubscriptionId: stripeSubscription.id,
    status: mapStripeSubscriptionStatus(stripeSubscription.status),
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    canceledAt: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null,
    endedAt: stripeSubscription.ended_at
      ? new Date(stripeSubscription.ended_at * 1000)
      : null,
    trialStart: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : null,
    trialEnd: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null,
  };

  if (existingSubscription) {
    await db
      .update(subscription)
      .set(subscriptionData)
      .where(eq(subscription.id, existingSubscription.id));
    result.updated++;
    console.log(`Updated subscription: ${existingSubscription.id}`);
  } else {
    const [newSubscription] = await db
      .insert(subscription)
      .values({
        id: crypto.randomUUID(),
        ...subscriptionData,
      })
      .returning();
    result.created++;
    console.log(`Created subscription: ${newSubscription.id}`);
  }
}
