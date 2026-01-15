import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  Shield,
  RefreshCw,
  Headphones,
} from "lucide-react";
import { db } from "@/db/drizzle";
import { product, price } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PricingGrid, type PricingPlan } from "@/components/marketing";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  const productData = await db.query.product.findFirst({
    where: and(eq(product.slug, slug), eq(product.active, true)),
    with: {
      prices: {
        where: eq(price.active, true),
        orderBy: asc(price.unitAmount),
      },
    },
  });

  return productData;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const productData = await getProduct(slug);

  if (!productData) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: productData.name,
    description:
      productData.description ?? `Learn more about ${productData.name}`,
  };
}

const typeLabels = {
  plugin: "WordPress Plugin",
  theme: "WordPress Theme",
  source_code: "Source Code",
  other: "Digital Product",
};

const highlights = [
  {
    icon: Download,
    title: "Instant Download",
    description: "Get access immediately after purchase",
  },
  {
    icon: RefreshCw,
    title: "Auto Updates",
    description: "Receive updates directly in WordPress",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Get help from our expert team",
  },
  {
    icon: Shield,
    title: "Money Back Guarantee",
    description: "14-day no questions asked refund",
  },
];

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const productData = await getProduct(slug);

  if (!productData) {
    notFound();
  }

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isLoggedIn = !!session?.user;

  // Parse features from JSON
  const features: string[] = productData.features
    ? JSON.parse(productData.features)
    : [];

  // Convert prices to pricing plans
  const plans: PricingPlan[] = productData.prices.map((p, index) => ({
    id: p.id,
    name:
      p.interval === "year"
        ? "Annual"
        : p.interval === "month"
          ? "Monthly"
          : "One-Time",
    description:
      p.interval === "year"
        ? "Best value - save 20%"
        : p.interval === "month"
          ? "Flexible monthly billing"
          : "Pay once, use forever",
    price: p.unitAmount,
    currency: p.currency,
    interval: p.interval,
    intervalCount: p.intervalCount ?? 1,
    features: features.slice(0, 6),
    popular: p.interval === "year" || index === 0,
    stripePriceId: p.stripePriceId,
    productName: productData.name,
  }));

  return (
    <div className="py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link
          href="/products"
          className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>

        {/* Product Header */}
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left Column - Product Info */}
          <div>
            <Badge variant="secondary" className="mb-4">
              {typeLabels[productData.type]}
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight">
              {productData.name}
            </h1>
            {productData.description && (
              <p className="text-muted-foreground mt-4 text-lg">
                {productData.description}
              </p>
            )}

            {/* Product Image/Preview */}
            <div className="from-primary/10 to-primary/5 mt-8 flex aspect-video items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br">
              <div className="text-primary/20 text-8xl font-bold">
                {productData.name.charAt(0)}
              </div>
            </div>

            {/* Highlights */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              {highlights.map((highlight, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <highlight.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{highlight.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Pricing */}
          <div>
            <div className="sticky top-24">
              <h2 className="mb-6 text-2xl font-bold">Choose Your Plan</h2>
              {plans.length > 0 ? (
                <PricingGrid plans={plans} isLoggedIn={isLoggedIn} />
              ) : (
                <div className="bg-card rounded-2xl border p-8 text-center">
                  <p className="text-muted-foreground">
                    Pricing coming soon. Contact us for more information.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/contact">Contact Sales</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-16" />

        {/* Features Section */}
        {features.length > 0 && (
          <div className="max-w-3xl">
            <h2 className="mb-8 text-2xl font-bold">Features</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="bg-primary/10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="text-primary h-4 w-4" />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl">
          <h2 className="mb-8 text-2xl font-bold">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">What happens after I purchase?</h3>
              <p className="text-muted-foreground mt-2">
                You&apos;ll receive instant access to download the product and
                your license key. You can manage your licenses and downloads
                from your dashboard.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">How do updates work?</h3>
              <p className="text-muted-foreground mt-2">
                Updates are delivered automatically through WordPress. Simply
                enter your license key in the plugin/theme settings, and
                you&apos;ll receive updates like any other WordPress product.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">
                Can I use this on multiple sites?
              </h3>
              <p className="text-muted-foreground mt-2">
                Each license allows activation on a specific number of domains.
                You can manage your domain activations from your dashboard. Need
                more sites? Contact us for volume pricing.
              </p>
            </div>
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold">What&apos;s your refund policy?</h3>
              <p className="text-muted-foreground mt-2">
                We offer a 14-day money-back guarantee. If you&apos;re not
                satisfied with your purchase, contact our support team for a
                full refund.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
