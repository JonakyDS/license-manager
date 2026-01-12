import { Suspense } from "react";
import { getUsers } from "@/lib/actions/users";
import { UsersClient } from "./users-client";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import type { SortDirection } from "@/lib/types/admin";

export const metadata = {
  title: "Users Management",
};

interface UsersPageProps {
  searchParams: Promise<{
    search?: string;
    role?: string;
    status?: string;
    page?: string;
    pageSize?: string;
    sortColumn?: string;
    sortDirection?: string;
  }>;
}

async function UsersData({ searchParams }: UsersPageProps) {
  const params = await searchParams;

  const search = params.search || "";
  const role = params.role || "all";
  const status = params.status || "all";
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || DEFAULT_PAGE_SIZE;
  const sortColumn = params.sortColumn || "createdAt";
  const sortDirection = (params.sortDirection as SortDirection) || "desc";

  const result = await getUsers(
    { search, role, status },
    page,
    pageSize,
    sortColumn,
    sortDirection
  );

  const data = result.data ?? {
    users: [],
    pagination: { page: 1, pageSize, totalItems: 0, totalPages: 0 },
  };

  return <UsersClient initialData={data} />;
}

function UsersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-md border">
        <div className="border-b p-4">
          <div className="flex gap-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b p-4 last:border-0">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}

export default function UsersPage(props: UsersPageProps) {
  return (
    <Suspense fallback={<UsersLoadingSkeleton />}>
      <UsersData {...props} />
    </Suspense>
  );
}
