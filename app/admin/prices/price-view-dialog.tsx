"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ViewDialog, DetailRow } from "@/components/admin";
import type { PriceTableData } from "@/lib/types/admin";
import {
  DollarSignIcon,
  PackageIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  ClockIcon,
  RepeatIcon,
} from "lucide-react";

interface PriceViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: PriceTableData | null;
}

const typeLabels: Record<string, string> = {
  one_time: "One Time",
  recurring: "Recurring",
};

const intervalLabels: Record<string, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

export function PriceViewDialog({
  open,
  onOpenChange,
  price,
}: PriceViewDialogProps) {
  if (!price) return null;

  const intervalText =
    price.type === "recurring" && price.interval
      ? price.intervalCount && price.intervalCount > 1
        ? `Every ${price.intervalCount} ${price.interval}s`
        : intervalLabels[price.interval]
      : null;

  return (
    <ViewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Price Details"
      maxWidth="sm"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-lg">
            <DollarSignIcon className="size-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold">
              {formatCurrency(price.unitAmount, price.currency)}
            </h3>
            <p className="text-muted-foreground text-sm">
              {price.product?.name || "Unknown Product"}
            </p>
            <div className="flex gap-2">
              <Badge variant="outline">{typeLabels[price.type]}</Badge>
              <Badge variant={price.active ? "default" : "secondary"}>
                {price.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid gap-4">
          <DetailRow
            icon={<PackageIcon className="size-4" />}
            label="Product"
            value={price.product?.name || "Unknown"}
          />
          <DetailRow
            icon={<DollarSignIcon className="size-4" />}
            label="Amount"
            value={formatCurrency(price.unitAmount, price.currency)}
          />
          <DetailRow
            icon={<TagIcon className="size-4" />}
            label="Currency"
            value={price.currency.toUpperCase()}
          />
          <DetailRow
            icon={<RepeatIcon className="size-4" />}
            label="Type"
            value={<Badge variant="outline">{typeLabels[price.type]}</Badge>}
          />
          {price.type === "recurring" && intervalText && (
            <DetailRow
              icon={<ClockIcon className="size-4" />}
              label="Billing Interval"
              value={intervalText}
            />
          )}
          {price.trialPeriodDays && price.trialPeriodDays > 0 && (
            <DetailRow
              icon={<ClockIcon className="size-4" />}
              label="Trial Period"
              value={`${price.trialPeriodDays} days`}
            />
          )}
          <DetailRow
            icon={
              price.active ? (
                <CheckCircleIcon className="size-4 text-green-600" />
              ) : (
                <XCircleIcon className="text-muted-foreground size-4" />
              )
            }
            label="Status"
            value={price.active ? "Active" : "Inactive"}
          />
          <DetailRow
            icon={<CreditCardIcon className="size-4" />}
            label="Stripe Price ID"
            value={
              <code className="bg-muted rounded px-2 py-1 text-xs">
                {price.stripePriceId}
              </code>
            }
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Created"
            value={format(
              new Date(price.createdAt),
              "MMMM d, yyyy 'at' h:mm a"
            )}
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Last Updated"
            value={format(
              new Date(price.updatedAt),
              "MMMM d, yyyy 'at' h:mm a"
            )}
          />
        </div>
      </div>
    </ViewDialog>
  );
}
