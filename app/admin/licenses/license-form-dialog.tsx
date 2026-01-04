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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { createLicense, updateLicense } from "@/lib/actions/licenses";
import { LICENSE_STATUS } from "@/lib/constants/admin";
import type { LicenseTableData } from "@/lib/types/admin";

interface LicenseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license?: LicenseTableData | null;
  products: { id: string; name: string; slug: string }[];
  onSuccess?: () => void;
}

export function LicenseFormDialog({
  open,
  onOpenChange,
  license,
  products,
  onSuccess,
}: LicenseFormDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  const isEditing = Boolean(license);

  // Reset form when dialog opens/closes or license changes
  React.useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open, license]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    try {
      const result = isEditing
        ? await updateLicense(formData)
        : await createLicense(formData);

      if (result.success) {
        toast.success(result.message);
        onSuccess?.();
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
      <DialogContent className="sm:max-w-[550px]">
        <form
          onSubmit={handleSubmit}
          ref={formRef}
          className="flex h-full flex-col overflow-hidden"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {isEditing ? "Edit License" : "Generate License"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the license information below."
                : "Fill in the details to generate a new license key."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto py-6">
            {/* Hidden ID field for editing */}
            {isEditing && <input type="hidden" name="id" value={license?.id} />}

            {/* Product */}
            <div className="grid gap-2">
              <Label htmlFor="productId">Product</Label>
              <Select
                name="productId"
                defaultValue={license?.productId || ""}
                disabled={isLoading}
              >
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

            {/* Customer Name */}
            <div className="grid gap-2">
              <Label htmlFor="customerName">Customer Name (Optional)</Label>
              <Input
                id="customerName"
                name="customerName"
                placeholder="John Doe"
                defaultValue={license?.customerName || ""}
                disabled={isLoading}
              />
            </div>

            {/* Customer Email */}
            <div className="grid gap-2">
              <Label htmlFor="customerEmail">Customer Email (Optional)</Label>
              <Input
                id="customerEmail"
                name="customerEmail"
                type="email"
                placeholder="john@example.com"
                defaultValue={license?.customerEmail || ""}
                aria-invalid={!!errors.customerEmail}
                disabled={isLoading}
              />
              {errors.customerEmail && (
                <p className="text-destructive text-sm">
                  {errors.customerEmail[0]}
                </p>
              )}
            </div>

            {/* Status (only for editing) */}
            {isEditing && (
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  name="status"
                  defaultValue={license?.status || "active"}
                  disabled={isLoading}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_STATUS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Validity Days */}
            <div className="grid gap-2">
              <Label htmlFor="validityDays">Validity (Days)</Label>
              <Input
                id="validityDays"
                name="validityDays"
                type="number"
                min="1"
                placeholder="365"
                defaultValue={license?.validityDays || 365}
                disabled={isLoading}
              />
              <p className="text-muted-foreground text-xs">
                Number of days the license is valid after activation
              </p>
              {errors.validityDays && (
                <p className="text-destructive text-sm">
                  {errors.validityDays[0]}
                </p>
              )}
            </div>

            {/* Max Domain Changes */}
            <div className="grid gap-2">
              <Label htmlFor="maxDomainChanges">Max Domain Changes</Label>
              <Input
                id="maxDomainChanges"
                name="maxDomainChanges"
                type="number"
                min="0"
                placeholder="3"
                defaultValue={license?.maxDomainChanges || 3}
                disabled={isLoading}
              />
              <p className="text-muted-foreground text-xs">
                Maximum number of times the customer can change domains
              </p>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Internal notes about this license..."
                defaultValue={license?.notes || ""}
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0">
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
              {isEditing ? "Save Changes" : "Generate License"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
