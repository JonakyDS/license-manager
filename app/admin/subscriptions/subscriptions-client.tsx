"use client";

import * as React from "react";
import { useRouter } from "nextjs-toploader/app";
import { useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DataTable,
  DataTablePagination,
  DataTableSearch,
  DataTableFilters,
  DataTableActions,
  PageHeader,
  ConfirmDialog,
  type ActionItem,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import {
  adminCancelSubscription,
  adminResumeSubscription,
} from "@/lib/actions/subscriptions";
import type {
  SubscriptionTableData,
  DataTableColumn,
  SortDirection,
} from "@/lib/types/admin";
import {
  EyeIcon,
  XCircleIcon,
  PlayCircleIcon,
  CreditCardIcon,
} from "lucide-react";
import { SubscriptionViewDialog } from "./subscription-view-dialog";

const SUBSCRIPTION_STATUS_OPTIONS = [
  { label: "All Statuses", value: "all" },
  { label: "Active", value: "active" },
  { label: "Trialing", value: "trialing" },
  { label: "Canceled", value: "canceled" },
  { label: "Past Due", value: "past_due" },
  { label: "Unpaid", value: "unpaid" },
  { label: "Paused", value: "paused" },
];

interface SubscriptionsClientProps {
  initialData: {
    subscriptions: SubscriptionTableData[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export function SubscriptionsClient({ initialData }: SubscriptionsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [isLoading, setIsLoading] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [subscriptionToCancel, setSubscriptionToCancel] =
    React.useState<SubscriptionTableData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [subscriptionToView, setSubscriptionToView] =
    React.useState<SubscriptionTableData | null>(null);

  // Get current filters from URL
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentSortColumn = searchParams.get("sortColumn") || "createdAt";
  const currentSortDirection =
    (searchParams.get("sortDirection") as SortDirection) || "desc";

  // Update URL params
  const updateParams = React.useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const formatPrice = (amount: number, currency = "usd") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(amount / 100);
  };

  // Table columns
  const columns: DataTableColumn<SubscriptionTableData>[] =
    React.useMemo(() => {
      const statusColors: Record<
        string,
        "default" | "secondary" | "destructive" | "outline"
      > = {
        active: "default",
        trialing: "secondary",
        canceled: "outline",
        past_due: "destructive",
        unpaid: "destructive",
        paused: "secondary",
      };

      return [
        {
          key: "user",
          label: "Customer",
          render: (sub) => (
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <CreditCardIcon className="size-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {sub.user?.name || "Unknown"}
                </span>
                <span className="text-muted-foreground text-xs">
                  {sub.user?.email}
                </span>
              </div>
            </div>
          ),
        },
        {
          key: "product",
          label: "Product",
          render: (sub) => (
            <div className="flex flex-col">
              <span className="font-medium">
                {sub.price?.product?.name || "Unknown"}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatPrice(sub.price?.unitAmount ?? 0, sub.price?.currency)}
                {sub.price?.interval && `/${sub.price.interval}`}
              </span>
            </div>
          ),
        },
        {
          key: "status",
          label: "Status",
          sortable: true,
          render: (sub) => (
            <div className="flex flex-col gap-1">
              <Badge variant={statusColors[sub.status] || "outline"}>
                {sub.status}
              </Badge>
              {sub.cancelAtPeriodEnd && (
                <span className="text-destructive text-xs">
                  Cancels at period end
                </span>
              )}
            </div>
          ),
        },
        {
          key: "currentPeriodEnd",
          label: "Renews",
          sortable: true,
          render: (sub) => (
            <span className="text-muted-foreground">
              {format(new Date(sub.currentPeriodEnd), "MMM d, yyyy")}
            </span>
          ),
        },
        {
          key: "createdAt",
          label: "Created",
          sortable: true,
          render: (sub) => (
            <span className="text-muted-foreground">
              {format(new Date(sub.createdAt), "MMM d, yyyy")}
            </span>
          ),
        },
        {
          key: "actions",
          label: "",
          className: "w-[50px]",
          render: (sub) => {
            const actions: ActionItem[] = [
              {
                label: "View Details",
                icon: <EyeIcon className="size-4" />,
                onClick: () => {
                  setSubscriptionToView(sub);
                  setViewDialogOpen(true);
                },
              },
            ];

            if (
              (sub.status === "active" || sub.status === "trialing") &&
              !sub.cancelAtPeriodEnd
            ) {
              actions.push({
                label: "Cancel Subscription",
                icon: <XCircleIcon className="size-4" />,
                variant: "destructive",
                onClick: () => {
                  setSubscriptionToCancel(sub);
                  setCancelDialogOpen(true);
                },
              });
            }

            if (sub.cancelAtPeriodEnd && sub.status !== "canceled") {
              actions.push({
                label: "Resume Subscription",
                icon: <PlayCircleIcon className="size-4" />,
                onClick: async () => {
                  setIsLoading(true);
                  const formData = new FormData();
                  formData.append("id", sub.id);
                  const result = await adminResumeSubscription(formData);
                  if (result.success) {
                    toast.success("Subscription resumed");
                    router.refresh();
                  } else {
                    toast.error(
                      result.message || "Failed to resume subscription"
                    );
                  }
                  setIsLoading(false);
                },
              });
            }

            return <DataTableActions actions={actions} />;
          },
        },
      ];
    }, [router]);

  // Handlers
  const handleSearch = (value: string) => {
    updateParams({ search: value || null });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [key]: value });
  };

  const handleClearFilters = () => {
    updateParams({ search: null, status: null });
  };

  const handleSort = (column: string, direction: SortDirection) => {
    updateParams({ sortColumn: column, sortDirection: direction });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page });
  };

  const handlePageSizeChange = (pageSize: number) => {
    updateParams({ pageSize, page: 1 });
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionToCancel) return;

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("id", subscriptionToCancel.id);
      const result = await adminCancelSubscription(formData);
      if (result.success) {
        toast.success(
          "Subscription will be cancelled at end of billing period"
        );
        setCancelDialogOpen(false);
        setSubscriptionToCancel(null);
        router.refresh();
      } else {
        toast.error(result.message || "Failed to cancel subscription");
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Subscriptions"
        description="Manage customer subscriptions and billing"
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <DataTableSearch
          placeholder="Search by customer name or email..."
          value={currentSearch}
          onChange={handleSearch}
        />
        <DataTableFilters
          filters={[
            {
              key: "status",
              label: "Status",
              value: currentStatus,
              options: SUBSCRIPTION_STATUS_OPTIONS,
            },
          ]}
          onFilterChange={handleFilterChange}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Table */}
      <DataTable
        data={initialData.subscriptions}
        columns={columns}
        sortColumn={currentSortColumn}
        sortDirection={currentSortDirection}
        onSort={handleSort}
        emptyMessage="No subscriptions found"
      />

      {/* Pagination */}
      <DataTablePagination
        currentPage={initialData.pagination.page}
        totalPages={initialData.pagination.totalPages}
        pageSize={initialData.pagination.pageSize}
        totalItems={initialData.pagination.totalItems}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />

      {/* Cancel Dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel Subscription"
        description={`This will cancel the subscription for ${subscriptionToCancel?.user?.name || "this customer"}. They will continue to have access until the end of their current billing period.`}
        confirmText="Cancel Subscription"
        variant="destructive"
        isLoading={isLoading}
        onConfirm={handleCancelSubscription}
      />

      {/* View Dialog */}
      <SubscriptionViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        subscription={subscriptionToView}
      />
    </div>
  );
}
