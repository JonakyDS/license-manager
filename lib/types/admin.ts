// Admin types for reusable components

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface FilterConfig {
  search?: string;
  [key: string]: string | string[] | undefined;
}

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

// User specific types
export interface UserFilters extends FilterConfig {
  role?: string;
  status?: string;
}

export interface UserTableData {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Admin navigation types
export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  children?: NavItem[];
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}
