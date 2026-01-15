"use client";

import { useState } from "react";
import {
  RefreshCwIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export function StripeSyncCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/sync-stripe", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Sync failed");
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCwIcon className="size-5" />
          Stripe Subscription Sync
        </CardTitle>
        <CardDescription>
          Synchronize all subscription data from Stripe to the local database.
          Use this to recover from missed webhooks or for initial setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleSync} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2Icon className="mr-2 size-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCwIcon className="mr-2 size-4" />
              Sync Subscriptions from Stripe
            </>
          )}
        </Button>

        {result && (
          <Alert
            variant="default"
            className="border-green-500 bg-green-50 dark:bg-green-950/20"
          >
            <CheckCircleIcon className="size-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-400">
              Sync Completed Successfully
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  • Total processed: <strong>{result.synced}</strong>
                </li>
                <li>
                  • New subscriptions created: <strong>{result.created}</strong>
                </li>
                <li>
                  • Existing subscriptions updated:{" "}
                  <strong>{result.updated}</strong>
                </li>
                {result.errors.length > 0 && (
                  <li className="text-amber-600 dark:text-amber-400">
                    • Errors: <strong>{result.errors.length}</strong>
                  </li>
                )}
              </ul>
              {result.errors.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-amber-600 dark:text-amber-400">
                    View errors ({result.errors.length})
                  </summary>
                  <ul className="mt-2 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {result.errors.map((err, idx) => (
                      <li key={idx} className="break-all">
                        • {err}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>Sync Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <p className="text-muted-foreground text-xs">
          Note: This sync also runs automatically every 6 hours via a scheduled
          job.
        </p>
      </CardContent>
    </Card>
  );
}
