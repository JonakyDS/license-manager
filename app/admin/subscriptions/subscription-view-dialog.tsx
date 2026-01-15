"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DetailRow } from "@/components/admin";
import type { SubscriptionTableData } from "@/lib/types/admin";
import {
  UserIcon,
  MailIcon,
  PackageIcon,
  DollarSignIcon,
  CheckCircleIcon,
  CreditCardIcon,
  CalendarIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";

interface SubscriptionViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: SubscriptionTableData | null;
}

export function SubscriptionViewDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionViewDialogProps) {
  if (!subscription) return null;

  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  const statusColors: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    active: "default",
    trialing: "secondary",
    canceled: "outline",
    past_due: "destructive",
    unpaid: "destructive",
    paused: "secondary",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Subscription Details</DialogTitle>
          <DialogDescription>
            View subscription information for {subscription.user?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">
              Customer
            </h4>
            <DetailRow
              icon={<UserIcon className="size-4" />}
              label="Name"
              value={subscription.user?.name || "Unknown"}
            />
            <DetailRow
              icon={<MailIcon className="size-4" />}
              label="Email"
              value={subscription.user?.email || "Unknown"}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">
              Product
            </h4>
            <DetailRow
              icon={<PackageIcon className="size-4" />}
              label="Product"
              value={subscription.price?.product?.name || "Unknown"}
            />
            <DetailRow
              icon={<DollarSignIcon className="size-4" />}
              label="Price"
              value={`${formatPrice(
                subscription.price?.unitAmount ?? 0,
                subscription.price?.currency
              )}${subscription.price?.interval ? `/${subscription.price.interval}` : ""}`}
            />
          </div>

          {/* Subscription Info */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">
              Subscription
            </h4>
            <DetailRow
              icon={<CheckCircleIcon className="size-4" />}
              label="Status"
              value={
                <div className="flex items-center gap-2">
                  <Badge
                    variant={statusColors[subscription.status] || "outline"}
                  >
                    {subscription.status}
                  </Badge>
                  {subscription.cancelAtPeriodEnd && (
                    <span className="text-destructive text-xs">
                      Cancels at period end
                    </span>
                  )}
                </div>
              }
            />
            <DetailRow
              icon={<CreditCardIcon className="size-4" />}
              label="Stripe ID"
              value={
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  {subscription.stripeSubscriptionId}
                </code>
              }
            />
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Current Period"
              value={`${format(
                new Date(subscription.currentPeriodStart),
                "MMM d, yyyy"
              )} - ${format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}`}
            />
            {subscription.trialEnd && (
              <DetailRow
                icon={<ClockIcon className="size-4" />}
                label="Trial Ends"
                value={format(new Date(subscription.trialEnd), "MMM d, yyyy")}
              />
            )}
            {subscription.canceledAt && (
              <DetailRow
                icon={<XCircleIcon className="size-4" />}
                label="Canceled At"
                value={format(new Date(subscription.canceledAt), "MMM d, yyyy")}
              />
            )}
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-medium">Dates</h4>
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Created"
              value={format(
                new Date(subscription.createdAt),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />
            <DetailRow
              icon={<CalendarIcon className="size-4" />}
              label="Updated"
              value={format(
                new Date(subscription.updatedAt),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
