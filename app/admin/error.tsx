"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <AlertTriangleIcon className="text-destructive size-8" />
      </div>
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          An error occurred while loading this page. Please try again.
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCwIcon className="mr-2 size-4" />
        Try again
      </Button>
    </div>
  );
}
