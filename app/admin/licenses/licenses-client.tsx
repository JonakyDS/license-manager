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
import {
  deleteLicense,
  deleteLicenses,
  revokeLicense,
} from "@/lib/actions/licenses";
import { LICENSE_STATUS, DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import type {
  LicenseTableData,
  DataTableColumn,
  SortDirection,
} from "@/lib/types/admin";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CopyIcon,
  BanIcon,
} from "lucide-react";
import { LicenseFormDialog } from "./license-form-dialog";
import { LicenseViewDialog } from "./license-view-dialog";

interface LicensesClientProps {
  initialData: {
    licenses: LicenseTableData[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
  products: { id: string; name: string; slug: string }[];
}

export function LicensesClient({ initialData, products }: LicensesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = React.useState(false);
  const [licenseToDelete, setLicenseToDelete] =
    React.useState<LicenseTableData | null>(null);
  const [licenseToRevoke, setLicenseToRevoke] =
    React.useState<LicenseTableData | null>(null);
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [licenseToEdit, setLicenseToEdit] =
    React.useState<LicenseTableData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [licenseToView, setLicenseToView] =
    React.useState<LicenseTableData | null>(null);

  // Get current filters from URL
  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "all";
  const currentProductId = searchParams.get("productId") || "all";
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

  // Copy license key to clipboard
  const copyLicenseKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success("License key copied to clipboard");
    } catch {
      toast.error("Failed to copy license key");
    }
  };

  // Status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "expired":
        return "secondary";
      case "revoked":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Table columns
  const columns: DataTableColumn<LicenseTableData>[] = React.useMemo(
    () => [
      {
        key: "licenseKey",
        label: "License Key",
        sortable: true,
        render: (license) => (
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-2 py-1 font-mono text-xs">
              {license.licenseKey}
            </code>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-6"
              onClick={(e) => {
                e.stopPropagation();
                copyLicenseKey(license.licenseKey);
              }}
            >
              <CopyIcon className="size-3" />
            </Button>
          </div>
        ),
      },
      {
        key: "product",
        label: "Product",
        render: (license) => (
          <span className="text-sm">{license.product?.name || "Unknown"}</span>
        ),
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (license) => (
          <div className="flex flex-col">
            <span className="text-sm">{license.customerName || "No name"}</span>
            {license.customerEmail && (
              <span className="text-muted-foreground text-xs">
                {license.customerEmail}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (license) => (
          <Badge variant={getStatusVariant(license.status)}>
            {license.status}
          </Badge>
        ),
      },
      {
        key: "expiresAt",
        label: "Expires",
        sortable: true,
        render: (license) => (
          <span className="text-muted-foreground text-sm">
            {license.expiresAt
              ? format(new Date(license.expiresAt), "MMM d, yyyy")
              : "Never"}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (license) => (
          <span className="text-muted-foreground text-sm">
            {format(new Date(license.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-[50px]",
        render: (license) => {
          const actions: ActionItem[] = [
            {
              label: "View",
              icon: <EyeIcon className="size-4" />,
              onClick: () => {
                setLicenseToView(license);
                setViewDialogOpen(true);
              },
            },
            {
              label: "Copy Key",
              icon: <CopyIcon className="size-4" />,
              onClick: () => copyLicenseKey(license.licenseKey),
            },
            {
              label: "Edit",
              icon: <PencilIcon className="size-4" />,
              onClick: () => {
                setLicenseToEdit(license);
                setFormDialogOpen(true);
              },
            },
            ...(license.status === "active"
              ? [
                  {
                    label: "Revoke",
                    icon: <BanIcon className="size-4" />,
                    variant: "destructive" as const,
                    onClick: () => {
                      setLicenseToRevoke(license);
                      setRevokeDialogOpen(true);
                    },
                  },
                ]
              : []),
            {
              label: "Delete",
              icon: <TrashIcon className="size-4" />,
              variant: "destructive",
              onClick: () => {
                setLicenseToDelete(license);
                setDeleteDialogOpen(true);
              },
            },
          ];
          return <DataTableActions actions={actions} />;
        },
      },
    ],
    []
  );

  // Handlers
  const handleSearch = (value: string) => {
    updateParams({ search: value || null });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams({ [key]: value });
  };

  const handleClearFilters = () => {
    updateParams({ search: null, status: null, productId: null });
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

  const handleDeleteLicense = async () => {
    if (!licenseToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteLicense(licenseToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setLicenseToDelete(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete license");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRevokeLicense = async () => {
    if (!licenseToRevoke) return;

    setIsRevoking(true);
    try {
      const result = await revokeLicense(licenseToRevoke.id);
      if (result.success) {
        toast.success(result.message);
        setRevokeDialogOpen(false);
        setLicenseToRevoke(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to revoke license");
    } finally {
      setIsRevoking(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteLicenses(selectedIds);
      if (result.success) {
        toast.success(result.message);
        setBulkDeleteDialogOpen(false);
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete licenses");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setFormDialogOpen(false);
    setLicenseToEdit(null);
  };

  // Filter configurations
  const filterConfigs = [
    {
      key: "status",
      label: "Status",
      value: currentStatus,
      options: [{ value: "all", label: "All Status" }, ...LICENSE_STATUS],
    },
    {
      key: "productId",
      label: "Product",
      value: currentProductId,
      options: [
        { value: "all", label: "All Products" },
        ...products.map((p) => ({ value: p.id, label: p.name })),
      ],
    },
  ];

  const hasActiveFilters =
    currentSearch || currentStatus !== "all" || currentProductId !== "all";

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Licenses"
          description="Manage software licenses and activations"
          actions={
            <Button onClick={() => setFormDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Generate License
            </Button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DataTableSearch
              value={currentSearch}
              onChange={handleSearch}
              placeholder="Search licenses..."
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
          data={initialData.licenses}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortColumn={currentSortColumn}
          sortDirection={currentSortDirection}
          onSort={handleSort}
          emptyMessage="No licenses found"
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
        title="Delete License"
        description={`Are you sure you want to delete license "${licenseToDelete?.licenseKey}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteLicense}
      />

      {/* Revoke Dialog */}
      <ConfirmDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        title="Revoke License"
        description={`Are you sure you want to revoke license "${licenseToRevoke?.licenseKey}"? The license will no longer be valid.`}
        confirmText="Revoke"
        variant="destructive"
        isLoading={isRevoking}
        onConfirm={handleRevokeLicense}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Licenses"
        description={`Are you sure you want to delete ${selectedIds.length} license(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* License Form Dialog */}
      <LicenseFormDialog
        open={formDialogOpen}
        onOpenChange={(open: boolean) => {
          setFormDialogOpen(open);
          if (!open) setLicenseToEdit(null);
        }}
        license={licenseToEdit}
        products={products}
        onSuccess={handleFormSuccess}
      />

      {/* License View Dialog */}
      <LicenseViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        license={licenseToView}
      />
    </>
  );
}
