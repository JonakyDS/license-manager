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
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { deleteUser, deleteUsers } from "@/lib/actions/users";
import {
  USER_ROLES,
  USER_STATUS_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants/admin";
import type {
  UserTableData,
  DataTableColumn,
  SortDirection,
} from "@/lib/types/admin";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "lucide-react";
import { UserFormDialog } from "./user-form-dialog";
import { UserViewDialog } from "./user-view-dialog";

interface UsersClientProps {
  initialData: {
    users: UserTableData[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
    };
  };
}

export function UsersClient({ initialData }: UsersClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<UserTableData | null>(
    null
  );
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<UserTableData | null>(
    null
  );
  const [viewDialogOpen, setViewDialogOpen] = React.useState(false);
  const [userToView, setUserToView] = React.useState<UserTableData | null>(
    null
  );

  // Get current filters from URL
  const currentSearch = searchParams.get("search") || "";
  const currentRole = searchParams.get("role") || "all";
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

  // Table columns
  const columns: DataTableColumn<UserTableData>[] = React.useMemo(
    () => [
      {
        key: "name",
        label: "User",
        sortable: true,
        render: (user) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src={user.image || ""} alt={user.name} />
              <AvatarFallback className="text-xs">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">
                {user.email}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: "role",
        label: "Role",
        sortable: true,
        render: (user) => (
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
            {user.role}
          </Badge>
        ),
      },
      {
        key: "emailVerified",
        label: "Status",
        sortable: true,
        render: (user) => (
          <Badge variant={user.emailVerified ? "default" : "outline"}>
            {user.emailVerified ? "Verified" : "Unverified"}
          </Badge>
        ),
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        render: (user) => (
          <span className="text-muted-foreground">
            {format(new Date(user.createdAt), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        key: "actions",
        label: "",
        className: "w-[50px]",
        render: (user) => {
          const actions: ActionItem[] = [
            {
              label: "View",
              icon: <EyeIcon className="size-4" />,
              onClick: () => {
                setUserToView(user);
                setViewDialogOpen(true);
              },
            },
            {
              label: "Edit",
              icon: <PencilIcon className="size-4" />,
              onClick: () => {
                setUserToEdit(user);
                setFormDialogOpen(true);
              },
            },
            {
              label: "Delete",
              icon: <TrashIcon className="size-4" />,
              variant: "destructive",
              onClick: () => {
                setUserToDelete(user);
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
    updateParams({ search: null, role: null, status: null });
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        toast.success(result.message);
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteUsers(selectedIds);
      if (result.success) {
        toast.success(result.message);
        setBulkDeleteDialogOpen(false);
        setSelectedIds([]);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Failed to delete users");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = () => {
    setFormDialogOpen(false);
    setUserToEdit(null);
  };

  // Filter configurations
  const filterConfigs = [
    {
      key: "role",
      label: "Role",
      value: currentRole,
      options: [{ value: "all", label: "All Roles" }, ...USER_ROLES],
    },
    {
      key: "status",
      label: "Status",
      value: currentStatus,
      options: USER_STATUS_OPTIONS.map((s) => ({
        value: s.value,
        label: s.label,
      })),
    },
  ];

  const hasActiveFilters =
    currentSearch || currentRole !== "all" || currentStatus !== "all";

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Users"
          description="Manage user accounts and permissions"
          actions={
            <Button onClick={() => setFormDialogOpen(true)}>
              <PlusIcon className="mr-2 size-4" />
              Add User
            </Button>
          }
        />

        {/* Toolbar */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DataTableSearch
              value={currentSearch}
              onChange={handleSearch}
              placeholder="Search users..."
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
          data={initialData.users}
          columns={columns}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sortColumn={currentSortColumn}
          sortDirection={currentSortDirection}
          onSort={handleSort}
          emptyMessage="No users found"
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
        title="Delete User"
        description={`Are you sure you want to delete "${userToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleDeleteUser}
      />

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        title="Delete Users"
        description={`Are you sure you want to delete ${selectedIds.length} user(s)? This action cannot be undone.`}
        confirmText="Delete All"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={handleBulkDelete}
      />

      {/* User Form Dialog */}
      <UserFormDialog
        open={formDialogOpen}
        onOpenChange={(open: boolean) => {
          setFormDialogOpen(open);
          if (!open) setUserToEdit(null);
        }}
        user={userToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* User View Dialog */}
      <UserViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        user={userToView}
      />
    </>
  );
}
