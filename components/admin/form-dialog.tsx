"use client";

/**
 * FormDialog - A reusable dialog component for simple forms without complex form handling.
 *
 * Use this component when:
 * - You have a simple form that doesn't need complex validation
 * - You want to handle form submission via a callback function
 * - You don't need access to FormData or form ref
 *
 * For complex forms with FormData and validation, use FormDialogWrapper instead.
 *
 * @example
 * <FormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Create Item"
 *   description="Fill in the details"
 *   maxWidth="md"
 *   submitText="Create"
 *   isLoading={isLoading}
 *   onSubmit={handleSubmit}
 * >
 *   <Input name="name" />
 * </FormDialog>
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onSubmit?: () => void | Promise<void>;
  footerContent?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthClasses = {
  sm: "sm:max-w-[500px]",
  md: "sm:max-w-[550px]",
  lg: "sm:max-w-[600px]",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  submitText = "Save",
  cancelText = "Cancel",
  isLoading = false,
  onSubmit,
  footerContent,
  maxWidth = "sm",
}: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClasses[maxWidth]}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">{children}</div>
        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {footerContent}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          {onSubmit && (
            <Button type="submit" onClick={onSubmit} disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 size-4" />}
              {submitText}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
