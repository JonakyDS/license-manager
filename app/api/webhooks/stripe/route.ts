/**
 * Stripe Webhook Handler
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Processes checkout completions, subscription updates, and cancellations.
 */

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/db/drizzle";
import { user, subscription, price, product } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  stripe,
  constructWebhookEvent,
  mapStripeSubscriptionStatus,
  mapStripePriceInterval,
  STRIPE_WEBHOOK_SECRET,
} from "@/lib/stripe";

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handles successful checkout completion
 */
async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  console.log("Processing checkout.session.completed:", session.id);

  if (session.mode !== "subscription" || !session.subscription) {
    console.log("Not a subscription checkout, skipping");
    return;
  }

  const customerId = session.customer as string;

  // Find user by stripe customer ID
  const existingUser = await db.query.user.findFirst({
    where: eq(user.stripeCustomerId, customerId),
  });

  if (!existingUser) {
    console.error("No user found for Stripe customer:", customerId);
    return;
  }

  // Retrieve the full subscription
  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
    { expand: ["items.data.price.product"] }
  );

  await upsertSubscription(stripeSubscription, existingUser.id);
}

/**
 * Handles subscription updates (create/update)
 */
async function handleSubscriptionUpdated(
  stripeSubscription: Stripe.Subscription
) {
  console.log("Processing subscription update:", stripeSubscription.id);

  const customerId = stripeSubscription.customer as string;

  // Find user by stripe customer ID
  const existingUser = await db.query.user.findFirst({
    where: eq(user.stripeCustomerId, customerId),
  });

  if (!existingUser) {
    console.error("No user found for Stripe customer:", customerId);
    return;
  }

  await upsertSubscription(stripeSubscription, existingUser.id);
}

/**
 * Handles subscription deletion/cancellation
 */
async function handleSubscriptionDeleted(
  stripeSubscription: Stripe.Subscription
) {
  console.log("Processing subscription deletion:", stripeSubscription.id);

  const existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, stripeSubscription.id),
  });

  if (!existingSubscription) {
    console.log("Subscription not found in database, skipping");
    return;
  }

  await db
    .update(subscription)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      endedAt: new Date(),
    })
    .where(eq(subscription.id, existingSubscription.id));

  console.log("Subscription marked as canceled:", existingSubscription.id);
}

/**
 * Handles successful invoice payment
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("Processing invoice.payment_succeeded:", invoice.id);

  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) {
    console.log("Invoice not associated with subscription, skipping");
    return;
  }

  // Get subscription ID as string
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;

  const existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, subscriptionId),
  });

  if (!existingSubscription) {
    console.log("Subscription not found in database");
    return;
  }

  // Update subscription period
  await db
    .update(subscription)
    .set({
      status: "active",
      currentPeriodStart: new Date((invoice.period_start ?? 0) * 1000),
      currentPeriodEnd: new Date((invoice.period_end ?? 0) * 1000),
    })
    .where(eq(subscription.id, existingSubscription.id));

  console.log("Subscription updated after successful payment");
}

/**
 * Handles failed invoice payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("Processing invoice.payment_failed:", invoice.id);

  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  if (!subscriptionRef) {
    console.log("Invoice not associated with subscription, skipping");
    return;
  }

  // Get subscription ID as string
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef.id;

  const existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, subscriptionId),
  });

  if (!existingSubscription) {
    console.log("Subscription not found in database");
    return;
  }

  await db
    .update(subscription)
    .set({
      status: "past_due",
    })
    .where(eq(subscription.id, existingSubscription.id));

  console.log("Subscription marked as past_due after failed payment");
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Creates or updates a subscription in the database
 */
async function upsertSubscription(
  stripeSubscription: Stripe.Subscription,
  userId: string
) {
  const subscriptionItem = stripeSubscription.items.data[0];
  const stripePrice = subscriptionItem.price;
  const stripeProduct = stripePrice.product as Stripe.Product;

  // First, ensure the product exists in our database
  let dbProduct = await db.query.product.findFirst({
    where: eq(product.stripeProductId, stripeProduct.id),
  });

  if (!dbProduct) {
    // Create product if it doesn't exist
    const [newProduct] = await db
      .insert(product)
      .values({
        id: crypto.randomUUID(),
        name: stripeProduct.name,
        slug: stripeProduct.name.toLowerCase().replace(/\s+/g, "-"),
        description: stripeProduct.description ?? null,
        type: "plugin", // Default type
        stripeProductId: stripeProduct.id,
        active: stripeProduct.active,
      })
      .returning();
    dbProduct = newProduct;
    console.log("Created new product:", dbProduct.id);
  }

  // Ensure the price exists in our database
  let dbPrice = await db.query.price.findFirst({
    where: eq(price.stripePriceId, stripePrice.id),
  });

  if (!dbPrice) {
    // Create price if it doesn't exist
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
    console.log("Created new price:", dbPrice.id);
  }

  // Check if subscription already exists
  const existingSubscription = await db.query.subscription.findFirst({
    where: eq(subscription.stripeSubscriptionId, stripeSubscription.id),
  });

  // Get current period from subscription items
  const currentItem = stripeSubscription.items.data[0];
  const currentPeriodStart = currentItem?.current_period_start
    ? new Date(currentItem.current_period_start * 1000)
    : new Date();
  const currentPeriodEnd = currentItem?.current_period_end
    ? new Date(currentItem.current_period_end * 1000)
    : new Date();

  const subscriptionData = {
    userId,
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
    // Update existing subscription
    await db
      .update(subscription)
      .set(subscriptionData)
      .where(eq(subscription.id, existingSubscription.id));
    console.log("Updated subscription:", existingSubscription.id);
  } else {
    // Create new subscription
    const [newSubscription] = await db
      .insert(subscription)
      .values({
        id: crypto.randomUUID(),
        ...subscriptionData,
      })
      .returning();
    console.log("Created subscription:", newSubscription.id);
  }
}
