"use client";

/**
 * FormDialogWrapper - A reusable wrapper for complex form dialogs with native form handling.
 *
 * Use this component when:
 * - You need to handle FormData in form submissions
 * - You want to access the form element via ref
 * - You have complex forms with validation and error handling
 *
 * This component provides:
 * - Consistent form structure with flex layout
 * - Scrollable content area with fixed header and footer
 * - Native form submission with preventDefault
 * - Loading states and disabled form handling
 *
 * @example
 * <FormDialogWrapper
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Create Product"
 *   description="Fill in the product details"
 *   maxWidth="md"
 *   submitText="Create"
 *   isLoading={isLoading}
 *   onSubmit={handleSubmit}
 *   formRef={formRef}
 * >
 *   <input type="hidden" name="id" value={id} />
 *   <div className="grid gap-2">
 *     <Label htmlFor="name">Name</Label>
 *     <Input id="name" name="name" />
 *   </div>
 * </FormDialogWrapper>
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

interface FormDialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitText?: string;
  cancelText?: string;
  isLoading?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthClasses = {
  sm: "sm:max-w-[500px]",
  md: "sm:max-w-[550px]",
  lg: "sm:max-w-[600px]",
};

export function FormDialogWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  isLoading = false,
  formRef,
  maxWidth = "sm",
}: FormDialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClasses[maxWidth]}>
        <form
          onSubmit={onSubmit}
          ref={formRef}
          className="flex h-full flex-col overflow-hidden"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto py-6">
            {children}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner className="mr-2 size-4" />}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
