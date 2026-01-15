import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { product, price, subscription } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { PricingGrid, type PricingPlan } from "@/components/marketing";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for all our products",
};

async function getPricingPlans(): Promise<PricingPlan[]> {
  const products = await db.query.product.findMany({
    where: eq(product.active, true),
    with: {
      prices: {
        where: eq(price.active, true),
        orderBy: asc(price.unitAmount),
      },
    },
    orderBy: asc(product.name),
  });

  const plans: PricingPlan[] = [];

  products.forEach((p) => {
    const features: string[] = p.features ? JSON.parse(p.features) : [];

    p.prices.forEach((pr) => {
      plans.push({
        id: pr.id,
        name: `${p.name}${pr.interval === "year" ? " Annual" : pr.interval === "month" ? " Monthly" : ""}`,
        description: p.description ?? `Access to ${p.name}`,
        price: pr.unitAmount,
        currency: pr.currency,
        interval: pr.interval,
        intervalCount: pr.intervalCount ?? 1,
        features: features.slice(0, 6),
        popular: pr.interval === "year",
        stripePriceId: pr.stripePriceId,
        productName: p.name,
      });
    });
  });

  return plans;
}

async function getUserSubscription(userId: string) {
  const sub = await db.query.subscription.findFirst({
    where: and(
      eq(subscription.userId, userId),
      eq(subscription.status, "active")
    ),
  });
  return sub?.priceId;
}

const includedFeatures = [
  "All plugin/theme features",
  "Automatic updates",
  "Priority email support",
  "Documentation access",
  "Domain-based licensing",
  "14-day money-back guarantee",
];

export default async function PricingPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = !!session?.user;
  const currentPlanId = isLoggedIn
    ? await getUserSubscription(session.user.id)
    : undefined;

  const plans = await getPricingPlans();

  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Choose the perfect plan for your needs. All plans include automatic
            updates, priority support, and a 14-day money-back guarantee.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="mt-16">
          {plans.length > 0 ? (
            <PricingGrid
              plans={plans}
              isLoggedIn={isLoggedIn}
              currentPlanId={currentPlanId ?? undefined}
            />
          ) : (
            <div className="mx-auto max-w-md text-center">
              <p className="text-muted-foreground">
                No pricing plans available at the moment. Check back soon!
              </p>
            </div>
          )}
        </div>

        {/* What's Included */}
        <div className="mx-auto mt-24 max-w-2xl">
          <h2 className="text-center text-2xl font-bold">
            Everything You Need
          </h2>
          <p className="text-muted-foreground mt-4 text-center">
            All plans include these features
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {includedFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary h-4 w-4" />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="text-center text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="mt-8 space-y-6">
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">Can I switch plans later?</h3>
              <p className="text-muted-foreground mt-2">
                Yes! You can upgrade or downgrade your plan at any time. When
                upgrading, you&apos;ll be charged the prorated difference. When
                downgrading, the change will take effect at your next billing
                cycle.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">
                What payment methods do you accept?
              </h3>
              <p className="text-muted-foreground mt-2">
                We accept all major credit cards (Visa, MasterCard, American
                Express) through our secure payment provider, Stripe. We also
                support Apple Pay and Google Pay.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">Is there a free trial?</h3>
              <p className="text-muted-foreground mt-2">
                We don&apos;t offer free trials, but we do have a 14-day
                money-back guarantee. If you&apos;re not satisfied with your
                purchase, contact us for a full refund.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">Can I cancel my subscription?</h3>
              <p className="text-muted-foreground mt-2">
                Yes, you can cancel your subscription at any time from your
                dashboard. You&apos;ll continue to have access until the end of
                your current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
