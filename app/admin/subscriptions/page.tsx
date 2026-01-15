import { Suspense } from "react";
import { getSubscriptions } from "@/lib/actions/subscriptions";
import { SubscriptionsClient } from "./subscriptions-client";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import type { SortDirection } from "@/lib/types/admin";

export const metadata = {
  title: "Subscriptions Management",
};

interface SubscriptionsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sortColumn?: string;
    sortDirection?: string;
  }>;
}

async function SubscriptionsData({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams;

  const search = params.search || "";
  const status = params.status || "all";
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE;
  const sortColumn = params.sortColumn || "createdAt";
  const sortDirection = (params.sortDirection as SortDirection) || "desc";

  const result = await getSubscriptions(
    { search, status },
    page,
    pageSize,
    sortColumn,
    sortDirection
  );

  const data = result.data ?? {
    subscriptions: [],
    pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 },
  };

  return <SubscriptionsClient initialData={data} />;
}

function SubscriptionsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-4 last:border-0">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SubscriptionsPage(props: SubscriptionsPageProps) {
  return (
    <Suspense fallback={<SubscriptionsLoadingSkeleton />}>
      <SubscriptionsData {...props} />
    </Suspense>
  );
}
