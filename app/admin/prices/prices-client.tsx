"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DataTable,
  DataTablePagination,
  ConfirmDialog,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriceViewDialog } from "./price-view-dialog";
import { PriceFormDialog } from "./price-form-dialog";
import { deletePrice, togglePriceStatus } from "@/lib/actions/prices";
import type {
  PriceTableData,
  PriceFilters,
  PaginationConfig,
  ProductTableData,
  SortDirection,
  DataTableColumn,
} from "@/lib/types/admin";
import {
  MoreHorizontalIcon,
  EyeIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "lucide-react";

interface PricesClientProps {
  initialData: {
    prices: PriceTableData[];
    pagination: PaginationConfig;
  } | null;
  products: ProductTableData[];
  initialFilters: PriceFilters;
  initialSort: { column: string; direction: SortDirection };
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const typeLabels: Record<string, string> = {
  one_time: "One Time",
  recurring: "Recurring",
};

const intervalLabels: Record<string, string> = {
  day: "Daily",
  week: "Weekly",
  month: "Monthly",
  year: "Yearly",
};

export function PricesClient({
  initialData,
  products,
  initialFilters,
  initialSort,
}: PricesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState<PriceTableData | null>(
    null
  );

  // Update URL with new params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        router.push(`?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  // Handlers
  const handleView = (price: PriceTableData) => {
    setSelectedPrice(price);
    setViewDialogOpen(true);
  };

  const handleEdit = (price: PriceTableData) => {
    setSelectedPrice(price);
    setFormDialogOpen(true);
  };

  const handleDelete = (price: PriceTableData) => {
    setSelectedPrice(price);
    setDeleteDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedPrice(null);
    setFormDialogOpen(true);
  };

  const handleToggleStatus = async (price: PriceTableData) => {
    const result = await togglePriceStatus(price.id, !price.active);
    if (result.success) {
      toast.success(
        `Price ${price.active ? "deactivated" : "activated"} successfully`
      );
      router.refresh();
    } else {
      toast.error(result.message || "Failed to update price status");
    }
  };

  const confirmDelete = async () => {
    if (!selectedPrice) return;

    const result = await deletePrice(selectedPrice.id);
    if (result.success) {
      toast.success("Price deleted successfully");
      setDeleteDialogOpen(false);
      router.refresh();
    } else {
      toast.error(result.message || "Failed to delete price");
    }
  };

  // Table columns
  const columns: DataTableColumn<PriceTableData>[] = [
    {
      key: "product",
      label: "Product",
      render: (price) => (
        <div className="font-medium">
          {price.product?.name || "Unknown Product"}
        </div>
      ),
    },
    {
      key: "unitAmount",
      label: "Amount",
      sortable: true,
      render: (price) => (
        <span className="font-mono font-medium">
          {formatCurrency(price.unitAmount, price.currency)}
        </span>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (price) => (
        <Badge variant="outline">{typeLabels[price.type]}</Badge>
      ),
    },
    {
      key: "interval",
      label: "Interval",
      render: (price) =>
        price.type === "recurring" && price.interval ? (
          <span className="text-muted-foreground">
            {price.intervalCount && price.intervalCount > 1
              ? `Every ${price.intervalCount} ${price.interval}s`
              : intervalLabels[price.interval]}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "active",
      label: "Status",
      render: (price) => (
        <Badge variant={price.active ? "default" : "secondary"}>
          {price.active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (price) => (
        <span className="text-muted-foreground">
          {format(new Date(price.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (price) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(price)}>
              <EyeIcon className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(price)}>
              <EditIcon className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(price)}>
              {price.active ? (
                <>
                  <XCircleIcon className="mr-2 size-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckCircleIcon className="mr-2 size-4" />
                  Activate
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleDelete(price)}
              className="text-destructive"
            >
              <TrashIcon className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={initialFilters.productId || "all"}
            onValueChange={(value) =>
              updateParams({ productId: value, page: "1" })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={initialFilters.type || "all"}
            onValueChange={(value) => updateParams({ type: value, page: "1" })}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="one_time">One Time</SelectItem>
              <SelectItem value="recurring">Recurring</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={initialFilters.status || "all"}
            onValueChange={(value) =>
              updateParams({ status: value, page: "1" })
            }
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleCreate}>
          <PlusIcon className="mr-2 size-4" />
          Add Price
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={initialData?.prices || []}
        columns={columns}
        sortColumn={initialSort.column}
        sortDirection={initialSort.direction}
        onSort={(column, direction) =>
          updateParams({ sortColumn: column, sortDirection: direction })
        }
        isLoading={isPending}
      />

      {/* Pagination */}
      {initialData && (
        <DataTablePagination
          currentPage={initialData.pagination.page}
          totalPages={initialData.pagination.totalPages}
          pageSize={initialData.pagination.pageSize}
          totalItems={initialData.pagination.totalItems}
          onPageChange={(page) => updateParams({ page: page.toString() })}
          onPageSizeChange={(size) =>
            updateParams({ pageSize: size.toString(), page: "1" })
          }
        />
      )}

      {/* Dialogs */}
      <PriceViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        price={selectedPrice}
      />

      <PriceFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        price={selectedPrice}
        products={products}
        onSuccess={() => {
          setFormDialogOpen(false);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Price"
        description={`Are you sure you want to delete this price? This will also affect any associated subscriptions in Stripe.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
