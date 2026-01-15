import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { subscription } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { ArrowRight, CreditCard, Key, Package, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

async function getDashboardData(userId: string) {
  // Get active subscriptions
  const subscriptions = await db.query.subscription.findMany({
    where: and(
      eq(subscription.userId, userId),
      or(eq(subscription.status, "active"), eq(subscription.status, "trialing"))
    ),
    with: {
      price: {
        with: {
          product: true,
        },
      },
    },
  });

  return {
    subscriptions,
    activeSubscriptions: subscriptions.length,
    totalSpent: subscriptions.reduce(
      (acc, sub) => acc + (sub.price?.unitAmount ?? 0),
      0
    ),
  };
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const data = await getDashboardData(session.user.id);

  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {session.user.name}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's an overview of your account
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Subscriptions
            </CardTitle>
            <CreditCard className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions}</div>
            <p className="text-muted-foreground text-xs">
              {data.activeSubscriptions === 1
                ? "subscription"
                : "subscriptions"}{" "}
              active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Spend</CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPrice(data.totalSpent)}
            </div>
            <p className="text-muted-foreground text-xs">per billing cycle</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.subscriptions.length}
            </div>
            <p className="text-muted-foreground text-xs">products owned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">License Keys</CardTitle>
            <Key className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.subscriptions.length}
            </div>
            <p className="text-muted-foreground text-xs">active licenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your Subscriptions</CardTitle>
            <CardDescription>
              Manage your active subscriptions and billing
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/subscriptions">
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.subscriptions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                You don't have any active subscriptions yet.
              </p>
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.subscriptions.slice(0, 3).map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg font-bold">
                      {sub.price?.product?.name?.charAt(0) ?? "P"}
                    </div>
                    <div>
                      <p className="font-medium">
                        {sub.price?.product?.name ?? "Product"}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {formatPrice(
                          sub.price?.unitAmount ?? 0,
                          sub.price?.currency
                        )}
                        {sub.price?.interval && `/${sub.price.interval}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge
                        variant={
                          sub.status === "active" ? "default" : "secondary"
                        }
                      >
                        {sub.status}
                      </Badge>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Renews {formatDate(sub.currentPeriodEnd)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md">
          <Link href="/products">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Browse Products
              </CardTitle>
              <CardDescription>
                Explore our collection of plugins and themes
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md">
          <Link href="/dashboard/subscriptions">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Manage Billing
              </CardTitle>
              <CardDescription>
                Update payment method and view invoices
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="group hover:border-primary/50 cursor-pointer transition-all hover:shadow-md">
          <Link href="/dashboard/licenses">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                License Keys
              </CardTitle>
              <CardDescription>
                View and manage your license activations
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}
