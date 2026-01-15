/**
 * Stripe Checkout API
 *
 * Creates a Stripe checkout session for subscription purchases.
 * Requires authenticated user.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user, price } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getOrCreateStripeCustomer, createCheckoutSession } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Get the price from our database
    const dbPrice = await db.query.price.findFirst({
      where: eq(price.id, priceId),
      with: {
        product: true,
      },
    });

    if (!dbPrice) {
      return NextResponse.json({ error: "Price not found" }, { status: 404 });
    }

    if (!dbPrice.active) {
      return NextResponse.json(
        { error: "Price is no longer available" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const currentUser = await db.query.user.findFirst({
      where: eq(user.id, session.user.id),
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stripeCustomerId = await getOrCreateStripeCustomer({
      userId: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      stripeCustomerId: currentUser.stripeCustomerId,
    });

    // Update user with Stripe customer ID if new
    if (!currentUser.stripeCustomerId) {
      await db
        .update(user)
        .set({ stripeCustomerId })
        .where(eq(user.id, currentUser.id));
    }

    // Create checkout session
    const baseUrl = new URL(request.url).origin;
    const checkoutSession = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId: dbPrice.stripePriceId,
      baseUrl,
      metadata: {
        userId: currentUser.id,
        priceId: dbPrice.id,
        productId: dbPrice.productId,
      },
      trialPeriodDays: dbPrice.trialPeriodDays ?? undefined,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout session error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
