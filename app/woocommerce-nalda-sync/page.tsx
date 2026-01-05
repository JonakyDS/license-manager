import { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  ClockIcon,
  BarChart3Icon,
  RefreshCwIcon,
  LanguagesIcon,
  ShieldCheckIcon,
  DownloadIcon,
  UploadIcon,
  ZapIcon,
  TrendingUpIcon,
  BoxIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title:
    "WooCommerce Nalda Sync - Connect Your Store to Nalda Marketplace | Jonakyds",
  description:
    "Automatically sync products from WooCommerce to Nalda marketplace and import orders back. Save time, reduce errors, and grow your Swiss e-commerce business. 99 CHF/year.",
  keywords: [
    "WooCommerce Nalda",
    "Nalda marketplace integration",
    "Swiss e-commerce",
    "toy shop plugin",
    "WooCommerce marketplace sync",
  ],
};

export default function WooCommerceNaldaSyncPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="dark:to-background bg-gradient-to-b from-purple-50 to-white py-20 dark:from-purple-950/20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <Badge className="mb-4" variant="secondary">
              WooCommerce Plugin
            </Badge>
            <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-6xl">
              Sell More on Switzerland&apos;s Leading{" "}
              <span className="text-primary">Toy Marketplace</span>
            </h1>
            <p className="text-muted-foreground mb-8 text-xl md:text-2xl">
              Automatically sync your WooCommerce products to Nalda and import
              orders back - all in one plugin
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-lg" asChild>
                <Link href="#pricing">Get Started for 99 CHF/year</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg" asChild>
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </div>
            <div className="border-primary/20 bg-primary/5 mt-8 rounded-lg border px-6 py-4">
              <p className="text-center text-sm font-medium">
                🎉 New:{" "}
                <span className="text-primary font-semibold">
                  3-day license for just 1 CHF
                </span>
              </p>
            </div>
            <div className="text-muted-foreground mt-8 flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-green-500" />
                <span>Unlimited Products</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-green-500" />
                <span>Unlimited Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-5 text-green-500" />
                <span>1 Year Updates</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-red-600 dark:text-red-400">
                The Problem
              </h2>
              <p className="text-muted-foreground text-lg">
                Managing products on multiple platforms is time-consuming and
                error-prone. Manually updating inventory, prices, and processing
                orders from Nalda takes hours every week.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Hours wasted on manual product updates</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Risk of overselling and inventory errors</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-red-500">✗</span>
                  <span>Missed orders and unhappy customers</span>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-green-600 dark:text-green-400">
                The Solution
              </h2>
              <p className="text-muted-foreground text-lg">
                WooCommerce Nalda Sync automates everything. Set it up once and
                let it handle product synchronization and order imports
                automatically.
              </p>
              <ul className="space-y-3">
                <li className="flex gap-3">
                  <CheckCircleIcon className="size-5 text-green-500" />
                  <span>Automated two-way sync keeps everything in sync</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircleIcon className="size-5 text-green-500" />
                  <span>Real-time inventory updates prevent overselling</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircleIcon className="size-5 text-green-500" />
                  <span>Never miss an order from Nalda marketplace</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">How It Works</h2>
            <p className="text-muted-foreground mb-12 text-lg">
              Get started in 3 simple steps
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full text-2xl font-bold">
                  1
                </div>
                <h3 className="mb-2 text-xl font-semibold">
                  Install & Activate
                </h3>
                <p className="text-muted-foreground">
                  Download the plugin, install it on your WordPress site, and
                  enter your license key to activate.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full text-2xl font-bold">
                  2
                </div>
                <h3 className="mb-2 text-xl font-semibold">Configure</h3>
                <p className="text-muted-foreground">
                  Enter your Nalda API credentials and SFTP settings. Choose
                  your sync interval and preferences.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary mb-4 flex size-12 items-center justify-center rounded-full text-2xl font-bold">
                  3
                </div>
                <h3 className="mb-2 text-xl font-semibold">Sync & Grow</h3>
                <p className="text-muted-foreground">
                  Enable automatic sync and watch your products appear on Nalda.
                  Orders import automatically to WooCommerce.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">Powerful Features</h2>
            <p className="text-muted-foreground mb-12 text-lg">
              Everything you need to succeed on Nalda marketplace
            </p>
          </div>
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <UploadIcon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">Product Export</h3>
                <p className="text-muted-foreground">
                  Automatic CSV generation and SFTP upload to Nalda. Supports
                  simple and variable products with all variations.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <DownloadIcon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">Order Import</h3>
                <p className="text-muted-foreground">
                  Automatic order import from Nalda API with full customer
                  details. Prevents duplicate orders.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <BarChart3Icon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">
                  Real-time Dashboard
                </h3>
                <p className="text-muted-foreground">
                  Beautiful admin dashboard with sync statistics, status
                  updates, and next scheduled run times.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ClockIcon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">
                  Flexible Scheduling
                </h3>
                <p className="text-muted-foreground">
                  Configurable sync intervals from every 15 minutes to daily.
                  Manual sync available anytime.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <RefreshCwIcon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">
                  Sync Logs & History
                </h3>
                <p className="text-muted-foreground">
                  Detailed sync logs with manual/automatic trigger tracking.
                  Upload history with success/failure status.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <LanguagesIcon className="text-primary mb-4 size-10" />
                <h3 className="mb-2 text-xl font-semibold">German Language</h3>
                <p className="text-muted-foreground">
                  Full German (de_DE) language support. Perfect for Swiss
                  e-commerce stores.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">Why Choose Nalda Sync?</h2>
            <p className="text-muted-foreground mb-12 text-lg">
              Transform your e-commerce operations
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <ZapIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  Save Hours Every Week
                </h3>
                <p className="text-muted-foreground">
                  Eliminate manual product updates and order entry. Focus on
                  growing your business instead of managing data.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  Never Miss an Order
                </h3>
                <p className="text-muted-foreground">
                  Automatic order import ensures you never lose a sale from
                  Nalda marketplace.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <BoxIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Stay in Sync</h3>
                <p className="text-muted-foreground">
                  Keep inventory, prices, and product data synchronized across
                  platforms automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <ShieldCheckIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Reduce Errors</h3>
                <p className="text-muted-foreground">
                  Prevent overselling, pricing mistakes, and data entry errors
                  with automated sync.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <TrendingUpIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">
                  Scale Effortlessly
                </h3>
                <p className="text-muted-foreground">
                  Handle unlimited products and orders without additional work
                  or fees.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="text-primary size-8" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold">Peace of Mind</h3>
                <p className="text-muted-foreground">
                  Reliable, tested plugin with detailed logs and error handling.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground mb-12 text-lg">
              No per-product or per-order fees. Just one simple price.
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <Card>
              <CardContent className="p-8">
                <div className="mb-6 text-center">
                  <Badge className="mb-3" variant="secondary">
                    Get Started
                  </Badge>
                  <h3 className="mb-2 text-2xl font-bold">3-Day License</h3>
                  <div className="mb-2">
                    <span className="text-5xl font-bold">1</span>
                    <span className="text-muted-foreground text-2xl"> CHF</span>
                  </div>
                  <p className="text-muted-foreground">
                    for 3 days, per website
                  </p>
                </div>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>1 website license</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Unlimited products</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Unlimited orders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>All features included</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full" size="lg" variant="outline">
                  Get 3-Day License
                </Button>
              </CardContent>
            </Card>
            <Card className="border-primary shadow-lg">
              <CardContent className="p-8">
                <div className="mb-6 text-center">
                  <Badge className="mb-3">Most Popular</Badge>
                  <h3 className="mb-2 text-2xl font-bold">Annual License</h3>
                  <div className="mb-2">
                    <span className="text-5xl font-bold">99</span>
                    <span className="text-muted-foreground text-2xl"> CHF</span>
                  </div>
                  <p className="text-muted-foreground">per year, per website</p>
                </div>
                <ul className="mb-8 space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>1 website license</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Unlimited products</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Unlimited orders</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>1 year of updates</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Email support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>No setup fees</span>
                  </li>
                </ul>
                <Button className="w-full" size="lg">
                  Get Annual License
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground mb-12 text-lg">
              Everything you need to know
            </p>
          </div>
          <div className="mx-auto max-w-3xl">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  What is Nalda?
                </AccordionTrigger>
                <AccordionContent>
                  Nalda (nalda.com) is Switzerland&apos;s leading online
                  marketplace for toys, baby products, and children&apos;s
                  items. It connects sellers with parents and families across
                  Switzerland.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  Do I need a Nalda seller account?
                </AccordionTrigger>
                <AccordionContent>
                  Yes, you need an active Nalda seller account. After creating
                  your Nalda account, you can find your SFTP credentials and API
                  key. Follow our documentation to obtain them and configure the
                  plugin with your credentials.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  How often do products sync?
                </AccordionTrigger>
                <AccordionContent>
                  You can configure sync intervals from every 15 minutes to
                  daily. Choose the frequency that works best for your business.
                  Manual sync is also available anytime.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  Is there a product or order limit?
                </AccordionTrigger>
                <AccordionContent>
                  No! The plugin supports unlimited products and orders. There
                  are no per-product or per-order fees - just one simple annual
                  license.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  What WooCommerce versions are supported?
                </AccordionTrigger>
                <AccordionContent>
                  The plugin requires WooCommerce 6.0 or higher and WordPress
                  5.8 or higher. It&apos;s tested with the latest versions for
                  best compatibility.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  Can I choose which products to sync?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! You have per-product sync control. Enable or disable sync
                  for individual products directly from the product edit screen
                  in WooCommerce.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-7">
                <AccordionTrigger className="text-left">
                  What happens when my license expires?
                </AccordionTrigger>
                <AccordionContent>
                  When your license expires, the plugin will stop functioning.
                  You won&apos;t be able to sync products or import orders until
                  you renew your license. Renew to continue using the plugin and
                  receive updates and support.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-8">
                <AccordionTrigger className="text-left">
                  What is the 3-day license?
                </AccordionTrigger>
                <AccordionContent>
                  The 3-day license is a short-term option for just 1 CHF that
                  gives you full access to all plugin features for 3 days.
                  Perfect for testing the plugin with your store before
                  committing to the annual license.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-4 text-4xl font-bold">System Requirements</h2>
            <p className="text-muted-foreground mb-12 text-lg">
              Make sure your system meets these requirements
            </p>
          </div>
          <div className="mx-auto max-w-2xl">
            <Card>
              <CardContent className="p-8">
                <ul className="space-y-4">
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>WordPress 5.8 or higher</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>WooCommerce 6.0 or higher</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>PHP 7.4 or higher</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>Active Nalda Seller Account</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircleIcon className="size-5 text-green-500" />
                    <span>SFTP credentials from Nalda</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-primary text-primary-foreground py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-4xl font-bold">
            Ready to Expand Your Reach on Nalda?
          </h2>
          <p className="mb-8 text-xl opacity-90">
            Start syncing your products today and grow your business
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" variant="secondary" className="text-lg">
              Get Started for 99 CHF/year
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary text-lg"
            >
              Contact Support
            </Button>
          </div>
          <p className="mt-8 text-sm opacity-75">
            Questions? Email us at{" "}
            <a
              href="mailto:support@jonakyds.com"
              className="underline hover:opacity-100"
            >
              support@jonakyds.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
