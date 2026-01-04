"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DataTable,
  DataTablePagination,
  DataTableSearch,
  DataTableFilters,
  DataTableActions,
  DataTableBulkActions,
  PageHeader,
  ConfirmDialog,
  type ActionItem,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteProduct, deleteProducts } from "@/lib/actions/products";
import {
  PRODUCT_TYPES,
  PRODUCT_STATUS_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants/admin";
import type {
  ProductTableData,
  DataTableColumn,
  SortDirection,
} from "@/lib/types/admin";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  PackageIcon,
} from "lucide-react";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductViewDialog } from "./product-view-dialog";

interface ProductsClientProps {
  initialData: {
    products: ProductTableData[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export function ProductsClient({ initialData }: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [productToDelete, setProductToDelete] =
    React.useState<ProductTableData | null>(null);
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [productToEdit, setProductToEdit] =
    React.useState<ProductTableData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [productToView, setProductToView] =
    React.useState<ProductTableData | null>(null);

  // Get current filters from URL
  const currentSearch = searchParams.get("search") || "";
  const currentType = searchParams.get("type") || "all";
  const currentStatus = searchParams.get("status") || "all";
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentPageSize =
    Number(searchParams.get("pageSize")) || DEFAULT_PAGE_SIZE;
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

      // Reset to page 1 when filters change (except when changing page itself)
      if (!("page" in updates)) {
        params.delete("page");
      }

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  // Table columns
  const columns: DataTableColumn<ProductTableData>[] = React.useMemo(() => {
    // Product type labels
    const typeLabels: Record<string, string> = {
      plugin: "Plugin",
      theme: "Theme",
      source_code: "Source Code",
      other: "Other",
    };

    return [
      {
        key: "name",
        label: "Product",
        sortable: true,
        render: (product) => (
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <PackageIcon className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium">{product.name}</span>
              <span className="text-muted-foreground text-xs">
                {product.slug}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (product) => (
          <Badge variant="outline">{typeLabels[product.type]}</Badge>
        ),
      },
      {
        key: "active",
        label: "Status",
        sortable: true,
        render: (product) => (
          <Badge variant={product.active ? "default" : "secondary"}>
            {product.active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        key: "licenses",
        label: "Licenses",
        render: (product) => (
          <span className="text-muted-foreground">
            {product._count?.licenses ?? 0}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (product) => (
          <span className="text-muted-foreground">
            {format(new Date(product.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-[50px]",
        render: (product) => {
          const actions: ActionItem[] = [
            {
              label: "View",
              icon: <EyeIcon className="size-4" />,
              onClick: () => {
                setProductToView(product);
                setViewDialogOpen(true);
              },
            },
            {
              label: "Edit",
              icon: <PencilIcon className="size-4" />,
              onClick: () => {
                setProductToEdit(product);
                setFormDialogOpen(true);
              },
            },
            {
              label: "Delete",
              icon: <TrashIcon className="size-4" />,
              variant: "destructive",
              onClick: () => {
                setProductToDelete(product);
                setDeleteDialogOpen(true);
              },
            },
          ];
          return <DataTableActions actions={actions} />;
        },
      },
    ];
  }, []);

  // Handlers
  const handleSearch = (value: string) => {
    updateParams({ search: value || null });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [key]: value });
  };

  const handleClearFilters = () => {
    updateParams({ search: null, type: null, status: null });
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

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteProduct(productToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProducts(selectedIds);
      if (result.success) {
        toast.success(result.message);
        setBulkDeleteDialogOpen(false);
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete products");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setFormDialogOpen(false);
    setProductToEdit(null);
  };

  // Filter configurations
  const filterConfigs = [
    {
      key: "type",
      label: "Type",
      value: currentType,
      options: [{ value: "all", label: "All Types" }, ...PRODUCT_TYPES],
    },
    {
      key: "status",
      label: "Status",
      value: currentStatus,
      options: PRODUCT_STATUS_OPTIONS.map((s) => ({
        value: s.value,
        label: s.label,
      })),
    },
  ];

  const hasActiveFilters =
    currentSearch || currentType !== "all" || currentStatus !== "all";

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Products"
          description="Manage your digital products and software"
          actions={
            <Button onClick={() => setFormDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Add Product
            </Button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DataTableSearch
              value={currentSearch}
              onChange={handleSearch}
              placeholder="Search products..."
              className="sm:max-w-xs"
            />
            <DataTableFilters
              filters={filterConfigs}
              onFilterChange={handleFilterChange}
              onClearFilters={hasActiveFilters ? handleClearFilters : undefined}
            />
          </div>

          {/* Bulk Actions */}
          <DataTableBulkActions
            selectedCount={selectedIds.length}
            onDelete={() => setBulkDeleteDialogOpen(true)}
            onClearSelection={() => setSelectedIds([])}
            isDeleting={isDeleting}
          />
        </div>

        {/* Table */}
        <DataTable
          data={initialData.products}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortColumn={currentSortColumn}
          sortDirection={currentSortDirection}
          onSort={handleSort}
          emptyMessage="No products found"
        />

        {/* Pagination */}
        <DataTablePagination
          currentPage={currentPage}
          totalPages={initialData.pagination.totalPages}
          pageSize={currentPageSize}
          totalItems={initialData.pagination.totalItems}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          selectedCount={selectedIds.length}
        />
      </div>

      {/* Single Delete Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteProduct}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Products"
        description={`Are you sure you want to delete ${selectedIds.length} product(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog
        open={formDialogOpen}
        onOpenChange={(open: boolean) => {
          setFormDialogOpen(open);
          if (!open) setProductToEdit(null);
        }}
        product={productToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Product View Dialog */}
      <ProductViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        product={productToView}
      />
    </>
  );
}
