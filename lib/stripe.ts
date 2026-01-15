/**
 * Stripe Configuration and Utilities
 *
 * Provides Stripe client initialization and helper functions
 * for managing payments, subscriptions, and customer portal.
 */

import Stripe from "stripe";

// =============================================================================
// STRIPE CLIENT
// =============================================================================

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// =============================================================================
// CONSTANTS
// =============================================================================

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// URLs for checkout success/cancel - adjust based on your app's routes
export const getCheckoutUrls = (baseUrl: string) => ({
  success: `${baseUrl}/dashboard?checkout=success`,
  cancel: `${baseUrl}/dashboard?checkout=cancel`,
});

export const getBillingPortalReturnUrl = (baseUrl: string) =>
  `${baseUrl}/dashboard`;

// =============================================================================
// CUSTOMER MANAGEMENT
// =============================================================================

/**
 * Creates or retrieves a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
  stripeCustomerId?: string | null;
}): Promise<string> {
  const { userId, email, name, stripeCustomerId } = params;

  // Return existing customer if already linked
  if (stripeCustomerId) {
    return stripeCustomerId;
  }

  // Check if customer exists by email
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name ?? undefined,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

// =============================================================================
// CHECKOUT SESSION
// =============================================================================

export interface CreateCheckoutSessionParams {
  customerId: string;
  priceId: string;
  baseUrl: string;
  metadata?: Record<string, string>;
  trialPeriodDays?: number;
  allowPromotionCodes?: boolean;
}

/**
 * Creates a Stripe checkout session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> {
  const {
    customerId,
    priceId,
    baseUrl,
    metadata = {},
    trialPeriodDays,
    allowPromotionCodes = true,
  } = params;

  const urls = getCheckoutUrls(baseUrl);

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: urls.success,
    cancel_url: urls.cancel,
    allow_promotion_codes: allowPromotionCodes,
    billing_address_collection: "auto",
    metadata,
  };

  // Add trial if specified
  if (trialPeriodDays) {
    sessionParams.subscription_data = {
      trial_period_days: trialPeriodDays,
      metadata,
    };
  } else {
    sessionParams.subscription_data = {
      metadata,
    };
  }

  return stripe.checkout.sessions.create(sessionParams);
}

// =============================================================================
// BILLING PORTAL
// =============================================================================

/**
 * Creates a billing portal session for customer self-service
 */
export async function createBillingPortalSession(
  customerId: string,
  baseUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: getBillingPortalReturnUrl(baseUrl),
  });
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Retrieves a subscription from Stripe
 */
export async function getStripeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    return null;
  }
}

/**
 * Cancels a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resumes a subscription that was set to cancel
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Immediately cancels a subscription
 */
export async function cancelSubscriptionImmediately(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.cancel(subscriptionId);
}

// =============================================================================
// PRICE MANAGEMENT
// =============================================================================

/**
 * Retrieves a price from Stripe
 */
export async function getStripePrice(
  priceId: string
): Promise<Stripe.Price | null> {
  try {
    return await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
  } catch {
    return null;
  }
}

/**
 * Lists all active prices for a product
 */
export async function listProductPrices(
  productId: string
): Promise<Stripe.Price[]> {
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    expand: ["data.product"],
  });
  return prices.data;
}

// =============================================================================
// PRODUCT MANAGEMENT
// =============================================================================

/**
 * Creates a product in Stripe
 */
export async function createStripeProduct(params: {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Product> {
  return stripe.products.create({
    name: params.name,
    description: params.description,
    metadata: params.metadata,
  });
}

/**
 * Creates a price for a product in Stripe
 */
export async function createStripePrice(params: {
  productId: string;
  unitAmount: number;
  currency?: string;
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    intervalCount?: number;
  };
  metadata?: Record<string, string>;
}): Promise<Stripe.Price> {
  const priceParams: Stripe.PriceCreateParams = {
    product: params.productId,
    unit_amount: params.unitAmount,
    currency: params.currency ?? "usd",
    metadata: params.metadata,
  };

  if (params.recurring) {
    priceParams.recurring = {
      interval: params.recurring.interval,
      interval_count: params.recurring.intervalCount ?? 1,
    };
  }

  return stripe.prices.create(priceParams);
}

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Constructs and verifies a Stripe webhook event
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    STRIPE_WEBHOOK_SECRET
  );
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

/**
 * Converts Stripe subscription status to our database enum
 */
export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
):
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid"
  | "paused" {
  return status as
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "trialing"
    | "unpaid"
    | "paused";
}

/**
 * Converts Stripe price interval to our database enum
 */
export function mapStripePriceInterval(
  interval: Stripe.Price.Recurring.Interval | null | undefined
): "day" | "week" | "month" | "year" | null {
  if (!interval) return null;
  return interval as "day" | "week" | "month" | "year";
}

/**
 * Formats amount from cents to display currency
 */
export function formatAmountFromCents(
  amount: number,
  currency = "usd"
): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

/**
 * Extracts expanded product from Stripe price
 */
export function getProductFromPrice(
  price: Stripe.Price
): Stripe.Product | null {
  if (typeof price.product === "string") {
    return null;
  }
  return price.product as Stripe.Product;
}
