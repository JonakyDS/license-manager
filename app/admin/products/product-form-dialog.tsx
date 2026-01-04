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
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { PRODUCT_TYPES } from "@/lib/constants/admin";
import type { ProductTableData } from "@/lib/types/admin";

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductTableData | null;
  onSuccess?: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
}: ProductFormDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const formRef = React.useRef<HTMLFormElement>(null);

  const isEditing = Boolean(product);

  // Reset form when dialog opens/closes or product changes
  React.useEffect(() => {
    if (open) {
      setErrors({});
    }
  }, [open, product]);

  // Generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditing && formRef.current) {
      const slugInput = formRef.current.querySelector(
        'input[name="slug"]'
      ) as HTMLInputElement;
      if (slugInput) {
        slugInput.value = e.target.value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    const formData = new FormData(e.currentTarget);

    try {
      const result = isEditing
        ? await updateProduct(formData)
        : await createProduct(formData);

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
        <form onSubmit={handleSubmit} ref={formRef}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Product" : "Create Product"}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the product information below."
                : "Fill in the details to create a new product."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-6">
            {/* Hidden ID field for editing */}
            {isEditing && <input type="hidden" name="id" value={product?.id} />}

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Awesome Plugin"
                defaultValue={product?.name || ""}
                onChange={handleNameChange}
                aria-invalid={!!errors.name}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-destructive text-sm">{errors.name[0]}</p>
              )}
            </div>

            {/* Slug */}
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="my-awesome-plugin"
                defaultValue={product?.slug || ""}
                aria-invalid={!!errors.slug}
                disabled={isLoading}
              />
              <p className="text-muted-foreground text-xs">
                URL-friendly identifier (lowercase, hyphens only)
              </p>
              {errors.slug && (
                <p className="text-destructive text-sm">{errors.slug[0]}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="A brief description of your product..."
                defaultValue={product?.description || ""}
                rows={3}
                disabled={isLoading}
              />
            </div>

            {/* Type */}
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                name="type"
                defaultValue={product?.type || "plugin"}
                disabled={isLoading}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-destructive text-sm">{errors.type[0]}</p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="active" className="text-base">
                  Active
                </Label>
                <p className="text-muted-foreground text-sm">
                  Make this product available for new licenses
                </p>
              </div>
              <Switch
                id="active"
                name="active"
                value="true"
                defaultChecked={product?.active ?? true}
                disabled={isLoading}
              />
            </div>
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
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
