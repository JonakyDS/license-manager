"use client";

/**
 * ViewDialog - A reusable dialog component for displaying read-only information.
 *
 * Use this component for:
 * - Displaying detailed information about an entity
 * - Read-only views without any form inputs
 * - Showing formatted data with proper spacing
 *
 * Features:
 * - Scrollable content area with fixed header
 * - Consistent max-width options (sm: 500px, md: 550px, lg: 600px)
 * - Proper flex layout for responsive overflow handling
 *
 * Commonly paired with DetailRow component for displaying key-value pairs.
 *
 * @example
 * <ViewDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="User Details"
 *   description="View user information"
 *   maxWidth="sm"
 * >
 *   <div className="space-y-6">
 *     <DetailRow icon={<UserIcon />} label="Name" value={user.name} />
 *   </div>
 * </ViewDialog>
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg";
}

const maxWidthClasses = {
  sm: "sm:max-w-[500px]",
  md: "sm:max-w-[550px]",
  lg: "sm:max-w-[600px]",
};

export function ViewDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  maxWidth = "sm",
}: ViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidthClasses[maxWidth]}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
