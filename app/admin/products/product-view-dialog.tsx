"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ViewDialog, DetailRow } from "@/components/admin";
import type { ProductTableData } from "@/lib/types/admin";
import {
  PackageIcon,
  TagIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  FileTextIcon,
  CreditCardIcon,
  ListIcon,
  DollarSignIcon,
} from "lucide-react";

interface ProductViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductTableData | null;
}

const typeLabels: Record<string, string> = {
  plugin: "Plugin",
  theme: "Theme",
  source_code: "Source Code",
  other: "Other",
};

export function ProductViewDialog({
  open,
  onOpenChange,
  product,
}: ProductViewDialogProps) {
  if (!product) return null;

  return (
    <ViewDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Product Details"
      maxWidth="sm"
    >
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-lg">
            <PackageIcon className="size-8" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-xl font-semibold">{product.name}</h3>
            <p className="text-muted-foreground text-sm">{product.slug}</p>
            <div className="flex gap-2">
              <Badge variant="outline">{typeLabels[product.type]}</Badge>
              <Badge variant={product.active ? "default" : "secondary"}>
                {product.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>

        <Separator />

        {/* Details */}
        <div className="grid gap-4">
          <DetailRow
            icon={<PackageIcon className="size-4" />}
            label="Name"
            value={product.name}
          />
          <DetailRow
            icon={<TagIcon className="size-4" />}
            label="Slug"
            value={product.slug}
          />
          <DetailRow
            icon={<FileTextIcon className="size-4" />}
            label="Type"
            value={<Badge variant="outline">{typeLabels[product.type]}</Badge>}
          />
          <DetailRow
            icon={
              product.active ? (
                <CheckCircleIcon className="size-4 text-green-600" />
              ) : (
                <XCircleIcon className="text-muted-foreground size-4" />
              )
            }
            label="Status"
            value={product.active ? "Active" : "Inactive"}
          />
          <DetailRow
            icon={<KeyIcon className="size-4" />}
            label="Licenses"
            value={`${product._count?.licenses ?? 0} license(s)`}
          />
          <DetailRow
            icon={<DollarSignIcon className="size-4" />}
            label="Prices"
            value={`${product._count?.prices ?? 0} price(s)`}
          />
          {product.stripeProductId && (
            <DetailRow
              icon={<CreditCardIcon className="size-4" />}
              label="Stripe Product ID"
              value={
                <code className="bg-muted rounded px-2 py-1 text-xs">
                  {product.stripeProductId}
                </code>
              }
            />
          )}
          {product.features && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ListIcon className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">Features</p>
              </div>
              <ul className="bg-muted list-inside list-disc space-y-1 rounded-lg p-3 text-sm">
                {(() => {
                  try {
                    const features = JSON.parse(product.features);
                    return Array.isArray(features) ? (
                      features.map((feature: string, idx: number) => (
                        <li key={idx}>{feature}</li>
                      ))
                    ) : (
                      <li>{product.features}</li>
                    );
                  } catch {
                    return <li>{product.features}</li>;
                  }
                })()}
              </ul>
            </div>
          )}
          {product.description && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">Description</p>
              <p className="bg-muted rounded-lg p-3 text-sm">
                {product.description}
              </p>
            </div>
          )}
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Created"
            value={format(
              new Date(product.createdAt),
              "MMMM d, yyyy 'at' h:mm a"
            )}
          />
          <DetailRow
            icon={<CalendarIcon className="size-4" />}
            label="Last Updated"
            value={format(
              new Date(product.updatedAt),
              "MMMM d, yyyy 'at' h:mm a"
            )}
          />
        </div>
      </div>
    </ViewDialog>
  );
}
