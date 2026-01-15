"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getMySubscriptions,
  cancelMySubscription,
  resumeMySubscription,
} from "@/lib/actions/subscriptions";
import type { SubscriptionTableData } from "@/lib/types/admin";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionTableData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchData() {
      const result = await getMySubscriptions();
      if (result.success && result.data) {
        setSubscriptions(result.data);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleCancel(subscriptionId: string) {
    startTransition(async () => {
      const result = await cancelMySubscription(subscriptionId);
      if (result.success) {
        toast.success(
          "Subscription will be cancelled at end of billing period"
        );
        // Reload subscriptions
        const refreshed = await getMySubscriptions();
        if (refreshed.success && refreshed.data) {
          setSubscriptions(refreshed.data);
        }
      } else {
        toast.error(result.errors?.[0] || "Failed to cancel subscription");
      }
    });
  }

  async function handleResume(subscriptionId: string) {
    startTransition(async () => {
      const result = await resumeMySubscription(subscriptionId);
      if (result.success) {
        toast.success("Subscription resumed successfully");
        // Reload subscriptions
        const refreshed = await getMySubscriptions();
        if (refreshed.success && refreshed.data) {
          setSubscriptions(refreshed.data);
        }
      } else {
        toast.error(result.errors?.[0] || "Failed to resume subscription");
      }
    });
  }

  async function openBillingPortal() {
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    }
  }

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
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelling</Badge>;
    }
    switch (status) {
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage your subscriptions and billing
            </p>
          </div>
        </div>
        <Button onClick={openBillingPortal}>
          <CreditCard className="mr-2 h-4 w-4" />
          Billing Portal
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-muted mb-4 rounded-full p-4">
              <CreditCard className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4 text-center">
              You haven&apos;t subscribed to any products yet. Browse our
              products to get started.
            </p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <Card key={sub.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg text-xl font-bold">
                    {sub.price?.product?.name?.charAt(0) ?? "P"}
                  </div>
                  <div>
                    <CardTitle>
                      {sub.price?.product?.name ?? "Product"}
                    </CardTitle>
                    <CardDescription>
                      {sub.price?.product?.slug}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(sub.status, sub.cancelAtPeriodEnd)}
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Price
                    </p>
                    <p className="text-lg font-semibold">
                      {formatPrice(
                        sub.price?.unitAmount ?? 0,
                        sub.price?.currency
                      )}
                      <span className="text-muted-foreground text-sm font-normal">
                        /{sub.price?.interval}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Started
                    </p>
                    <p className="text-lg font-semibold">
                      {formatDate(sub.currentPeriodStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      {sub.cancelAtPeriodEnd ? "Ends" : "Renews"}
                    </p>
                    <p className="text-lg font-semibold">
                      {formatDate(sub.currentPeriodEnd)}
                    </p>
                  </div>
                  <div className="flex items-end justify-end">
                    {sub.cancelAtPeriodEnd ? (
                      <Button
                        onClick={() => handleResume(sub.id)}
                        disabled={isPending}
                      >
                        {isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Resume Subscription
                      </Button>
                    ) : sub.status === "active" || sub.status === "trialing" ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" disabled={isPending}>
                            Cancel Subscription
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Cancel Subscription?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Your subscription will remain active until{" "}
                              {formatDate(sub.currentPeriodEnd)}. After that,
                              you will lose access to this product. You can
                              resume the subscription anytime before the end
                              date.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>
                              Keep Subscription
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancel(sub.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Cancel Subscription
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : null}
                  </div>
                </div>

                {sub.cancelAtPeriodEnd && (
                  <div className="bg-destructive/10 mt-4 rounded-lg p-4">
                    <p className="text-destructive text-sm">
                      This subscription is set to cancel on{" "}
                      {formatDate(sub.currentPeriodEnd)}. You can resume it
                      anytime before this date.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Billing Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>
            Manage your payment methods and view invoices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            You can update your payment method, download invoices, and manage
            your billing details through the Stripe Customer Portal.
          </p>
          <Button variant="outline" onClick={openBillingPortal}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Billing Portal
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
