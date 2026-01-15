"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { createPrice, updatePrice } from "@/lib/actions/prices";
import type { PriceTableData, ProductTableData } from "@/lib/types/admin";

interface PriceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: PriceTableData | null;
  products: ProductTableData[];
  onSuccess: () => void;
}

export function PriceFormDialog({
  open,
  onOpenChange,
  price,
  products,
  onSuccess,
}: PriceFormDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [priceType, setPriceType] = React.useState<"one_time" | "recurring">(
    "recurring"
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  const isEditing = Boolean(price);

  // Reset form when dialog opens/closes or price changes
  React.useEffect(() => {
    if (open) {
      setErrors({});
      if (price) {
        setPriceType(price.type);
      } else {
        setPriceType("recurring");
      }
    }
  }, [open, price]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    // Convert dollars to cents for new prices
    if (!isEditing) {
      const unitAmount = formData.get("unitAmount") as string;
      const amountInCents = Math.round(parseFloat(unitAmount || "0") * 100);
      formData.set("unitAmount", amountInCents.toString());
    }

    try {
      const result = isEditing
        ? await updatePrice(formData)
        : await createPrice(formData);

      if (result.success) {
        toast.success(result.message);
        onSuccess();
        onOpenChange(false);
      } else {
        if (result.errors) {
          setErrors(result.errors);
        }
        toast.error(result.message || "An error occurred");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Price" : "Create Price"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Only the active status can be modified for existing prices."
              : "Create a new price for a product. This will also create the price in Stripe."}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {isEditing && price && (
            <input type="hidden" name="id" value={price.id} />
          )}

          {/* Product - only for new prices */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="productId">Product *</Label>
              <Select name="productId" required>
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-destructive text-sm">
                  {errors.productId[0]}
                </p>
              )}
            </div>
          )}

          {/* Type - only for new prices */}
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="type">Price Type *</Label>
              <Select
                name="type"
                defaultValue="recurring"
                onValueChange={(value) =>
                  setPriceType(value as "one_time" | "recurring")
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select price type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One Time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-destructive text-sm">{errors.type[0]}</p>
              )}
            </div>
          )}

          {/* Amount and Currency - only for new prices */}
          {!isEditing && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unitAmount">Amount *</Label>
                <Input
                  id="unitAmount"
                  name="unitAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
                {errors.unitAmount && (
                  <p className="text-destructive text-sm">
                    {errors.unitAmount[0]}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select name="currency" defaultValue="usd">
                  <SelectTrigger id="currency">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usd">USD</SelectItem>
                    <SelectItem value="eur">EUR</SelectItem>
                    <SelectItem value="gbp">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Recurring options - only for new prices with recurring type */}
          {!isEditing && priceType === "recurring" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Interval</Label>
                  <Select name="interval" defaultValue="month">
                    <SelectTrigger id="interval">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Daily</SelectItem>
                      <SelectItem value="week">Weekly</SelectItem>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="intervalCount">Every X Intervals</Label>
                  <Input
                    id="intervalCount"
                    name="intervalCount"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="trialPeriodDays">Trial Period (days)</Label>
                <Input
                  id="trialPeriodDays"
                  name="trialPeriodDays"
                  type="number"
                  min="0"
                  defaultValue="0"
                  placeholder="0 for no trial"
                />
                <p className="text-muted-foreground text-xs">
                  Number of trial days before billing starts
                </p>
              </div>
            </>
          )}

          {/* Active status */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="active">Active</Label>
              <p className="text-muted-foreground text-xs">
                Active prices can be used for new subscriptions
              </p>
            </div>
            <Switch
              id="active"
              name="active"
              defaultChecked={price?.active ?? true}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 size-4" />}
              {isEditing ? "Update Price" : "Create Price"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
