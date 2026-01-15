import Link from "next/link";
import {
  ArrowRight,
  Check,
  Shield,
  Zap,
  Globe,
  RefreshCw,
  Lock,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db/drizzle";
import { product, price } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ProductGrid, type ProductCardProps } from "@/components/marketing";

const features = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Our products are optimized for performance, ensuring your site stays fast and responsive.",
  },
  {
    icon: Shield,
    title: "Secure & Reliable",
    description:
      "Built with security in mind, following WordPress best practices and regular security audits.",
  },
  {
    icon: Globe,
    title: "Global CDN",
    description:
      "Automatic updates delivered through our global CDN for instant, reliable downloads.",
  },
  {
    icon: RefreshCw,
    title: "Auto Updates",
    description:
      "Receive automatic updates directly in your WordPress dashboard with your license key.",
  },
  {
    icon: Lock,
    title: "License Protection",
    description:
      "Domain-based licensing ensures your products are protected and only used on authorized sites.",
  },
  {
    icon: BarChart3,
    title: "Usage Analytics",
    description:
      "Track your license usage and manage activations through your personal dashboard.",
  },
];

const testimonials = [
  {
    content:
      "The WooCommerce Nalda Sync plugin has saved us countless hours. The setup was easy and it just works!",
    author: "Sarah M.",
    role: "E-commerce Manager",
    avatar: "S",
  },
  {
    content:
      "Excellent support and the product quality is outstanding. Highly recommended for any WooCommerce store.",
    author: "Michael R.",
    role: "Store Owner",
    avatar: "M",
  },
  {
    content:
      "Finally a solution that integrates seamlessly with our Swiss marketplace. Worth every penny!",
    author: "Thomas K.",
    role: "Digital Agency",
    avatar: "T",
  },
];

async function getProducts(): Promise<ProductCardProps[]> {
  const products = await db.query.product.findMany({
    where: eq(product.active, true),
    with: {
      prices: {
        where: eq(price.active, true),
        orderBy: asc(price.unitAmount),
        limit: 1,
      },
    },
  });

  return products.map((p) => {
    let features: string[] | undefined;
    if (p.features) {
      try {
        features = JSON.parse(p.features);
      } catch {
        // If features is not valid JSON, treat as undefined
        features = undefined;
      }
    }
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      type: p.type,
      features,
      startingPrice: p.prices[0]?.unitAmount,
      currency: p.prices[0]?.currency,
      interval: p.prices[0]?.interval ?? undefined,
    };
  });
}

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary/0.1),transparent)] absolute inset-0 -z-10" />
        <div className="bg-background shadow-primary/5 ring-primary/5 absolute inset-y-0 right-1/2 -z-10 mr-16 w-[200%] origin-bottom-left skew-x-[-30deg] shadow-xl ring-1 sm:mr-28 lg:mr-0 xl:mr-16 xl:origin-center" />

        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              🎉 New: WooCommerce Nalda Sync v2.0
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Premium WordPress{" "}
              <span className="text-primary">Plugins & Themes</span>
            </h1>
            <p className="text-muted-foreground mt-6 text-lg leading-8">
              Powerful, secure, and reliable solutions for your WordPress site.
              Built by developers, for developers. Get started in minutes with
              our easy-to-use license management system.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="gap-2">
                <Link href="/products">
                  Browse Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
            <div className="text-muted-foreground mt-8 flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <Check className="text-primary h-4 w-4" />
                14-day money back
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-primary h-4 w-4" />
                Instant delivery
              </div>
              <div className="flex items-center gap-2">
                <Check className="text-primary h-4 w-4" />
                Priority support
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      {products.length > 0 && (
        <section className="bg-muted/30 border-t py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Our Products
              </h2>
              <p className="text-muted-foreground mt-4 text-lg">
                Choose from our selection of premium WordPress solutions
              </p>
            </div>
            <div className="mt-12">
              <ProductGrid products={products} />
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="outline" size="lg">
                <Link href="/products">
                  View All Products
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Why Choose Us?
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Everything you need for a successful WordPress project
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-card hover:border-primary/50 relative rounded-2xl border p-8 transition-all hover:shadow-lg"
              >
                <div className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground mt-2">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-muted/30 border-t py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by Developers
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              See what our customers have to say about our products
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-card rounded-2xl border p-8 shadow-sm"
              >
                <div className="flex gap-1 text-yellow-500">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="h-5 w-5 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-muted-foreground mt-4">
                  &ldquo;{testimonial.content}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-muted-foreground text-sm">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-primary relative isolate overflow-hidden rounded-3xl px-6 py-24 text-center shadow-2xl sm:px-16">
            <h2 className="text-primary-foreground mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="text-primary-foreground/80 mx-auto mt-6 max-w-xl text-lg leading-8">
              Join thousands of developers and businesses using our products.
              Start your journey today with our 14-day money-back guarantee.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="gap-2">
                <Link href="/products">
                  Browse Products
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 bg-transparent"
              >
                <Link href="/sign-up">Create Free Account</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
