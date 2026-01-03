"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TrashIcon, XIcon } from "lucide-react";

interface DataTableBulkActionsProps {
  selectedCount: number;
  onDelete?: () => void;
  onClearSelection: () => void;
  isDeleting?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function DataTableBulkActions({
  selectedCount,
  onDelete,
  onClearSelection,
  isDeleting = false,
  className,
  children,
}: DataTableBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "bg-muted/50 flex items-center gap-2 rounded-lg border px-4 py-2",
        className
      )}
    >
      <span className="text-sm font-medium">
        {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
      </span>
      <div className="ml-auto flex items-center gap-1">
        {children}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <TrashIcon className="mr-1 size-4" />
            Delete
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <XIcon className="mr-1 size-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
