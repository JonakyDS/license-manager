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
  DataTableBulkActions,
  PageHeader,
  ConfirmDialog,
  type ActionItem,
} from "@/components/admin";
import { Badge } from "@/components/ui/badge";
import { deleteCsvUpload, deleteCsvUploads } from "@/lib/actions/csv-uploads";
import { CSV_UPLOAD_STATUS, DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";
import type {
  CsvUploadTableData,
  DataTableColumn,
  SortDirection,
} from "@/lib/types/admin";
import {
  TrashIcon,
  EyeIcon,
  GlobeIcon,
  FileIcon,
  ServerIcon,
} from "lucide-react";
import { CsvUploadViewDialog } from "./csv-upload-view-dialog";

interface CsvUploadsClientProps {
  initialData: {
    csvUploads: CsvUploadTableData[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export function CsvUploadsClient({ initialData }: CsvUploadsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [csvUploadToDelete, setCsvUploadToDelete] =
    React.useState<CsvUploadTableData | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [csvUploadToView, setCsvUploadToView] =
    React.useState<CsvUploadTableData | null>(null);

  // Get current filters from URL
  const currentSearch = searchParams.get("search") || "";
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

      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Status badge variant
  const getStatusVariant = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "pending":
        return "outline";
      case "processing":
        return "secondary";
      case "processed":
        return "default";
      case "failed":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Table columns
  const columns: DataTableColumn<CsvUploadTableData>[] = React.useMemo(
    () => [
      {
        key: "domain",
        label: "Domain",
        sortable: true,
        render: (csvUpload) => (
          <div className="flex items-center gap-2">
            <GlobeIcon className="text-muted-foreground size-4" />
            <span className="font-medium">{csvUpload.domain}</span>
          </div>
        ),
      },
      {
        key: "csvFileName",
        label: "File",
        sortable: true,
        render: (csvUpload) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <FileIcon className="text-muted-foreground size-4" />
              <span className="max-w-[150px] truncate text-sm">
                {csvUpload.csvFileName}
              </span>
            </div>
            <span className="text-muted-foreground text-xs">
              {formatFileSize(csvUpload.csvFileSize)}
            </span>
          </div>
        ),
      },
      {
        key: "sftpHost",
        label: "SFTP",
        render: (csvUpload) => (
          <div className="flex items-center gap-2">
            <ServerIcon className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              {csvUpload.sftpHost}:{csvUpload.sftpPort}
            </span>
          </div>
        ),
      },
      {
        key: "license",
        label: "License",
        render: (csvUpload) => (
          <div className="flex flex-col">
            <code className="bg-muted max-w-[120px] truncate rounded px-1.5 py-0.5 font-mono text-xs">
              {csvUpload.license?.licenseKey || "Unknown"}
            </code>
            {csvUpload.license?.product?.name && (
              <span className="text-muted-foreground text-xs">
                {csvUpload.license.product.name}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (csvUpload) => (
          <Badge variant={getStatusVariant(csvUpload.status)}>
            {csvUpload.status}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (csvUpload) => (
          <span className="text-muted-foreground text-sm">
            {format(new Date(csvUpload.createdAt), "MMM d, yyyy HH:mm")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-[50px]",
        render: (csvUpload) => {
          const actions: ActionItem[] = [
            {
              label: "View Details",
              icon: <EyeIcon className="size-4" />,
              onClick: () => {
                setCsvUploadToView(csvUpload);
                setViewDialogOpen(true);
              },
            },
            {
              label: "Delete",
              icon: <TrashIcon className="size-4" />,
              variant: "destructive",
              onClick: () => {
                setCsvUploadToDelete(csvUpload);
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

  const handleDeleteCsvUpload = async () => {
    if (!csvUploadToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteCsvUpload(csvUploadToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setCsvUploadToDelete(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete CSV upload");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteCsvUploads(selectedIds);
      if (result.success) {
        toast.success(result.message);
        setBulkDeleteDialogOpen(false);
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete CSV uploads");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter configurations
  const filterConfigs = [
    {
      key: "status",
      label: "Status",
      value: currentStatus,
      options: [{ value: "all", label: "All Status" }, ...CSV_UPLOAD_STATUS],
    },
  ];

  const hasActiveFilters = currentSearch || currentStatus !== "all";

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="CSV Upload Requests"
          description="Manage Nalda CSV upload requests and their processing status"
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DataTableSearch
              value={currentSearch}
              onChange={handleSearch}
              placeholder="Search by domain, file name, or host..."
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
          data={initialData.csvUploads}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortColumn={currentSortColumn}
          sortDirection={currentSortDirection}
          onSort={handleSort}
          emptyMessage="No CSV upload requests found"
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
        title="Delete CSV Upload"
        description={`Are you sure you want to delete this CSV upload request for "${csvUploadToDelete?.domain}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteCsvUpload}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete CSV Uploads"
        description={`Are you sure you want to delete ${selectedIds.length} CSV upload request(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* CSV Upload View Dialog */}
      <CsvUploadViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        csvUpload={csvUploadToView}
      />
    </>
  );
}
