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

// Product specific types
export interface ProductFilters extends FilterConfig {
  type?: string;
  status?: string;
}

export interface ProductTableData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "plugin" | "theme" | "source_code" | "other";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    licenses: number;
  };
}

// License specific types
export interface LicenseFilters extends FilterConfig {
  status?: string;
  productId?: string;
}

export interface LicenseTableData {
  id: string;
  productId: string;
  licenseKey: string;
  customerName: string | null;
  customerEmail: string | null;
  status: "active" | "expired" | "revoked";
  validityDays: number;
  activatedAt: Date | null;
  expiresAt: Date | null;
  maxDomainChanges: number;
  domainChangesUsed: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

// CSV Upload specific types
export interface CsvUploadFilters extends FilterConfig {
  status?: string;
  licenseId?: string;
}

export interface CsvUploadTableData {
  id: string;
  licenseId: string;
  domain: string;
  sftpHost: string;
  sftpPort: number;
  sftpUsername: string;
  sftpPassword: string;
  csvFileKey: string;
  csvFileUrl: string;
  csvFileName: string;
  csvFileSize: number;
  status: "pending" | "processing" | "processed" | "failed";
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  license?: {
    id: string;
    licenseKey: string;
    customerName: string | null;
    customerEmail: string | null;
    product?: {
      id: string;
      name: string;
      slug: string;
    };
  };
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

// Price specific types
export interface PriceFilters extends FilterConfig {
  productId?: string;
  type?: string;
  status?: string;
}

export interface PriceTableData {
  id: string;
  productId: string;
  stripePriceId: string;
  type: "one_time" | "recurring";
  active: boolean;
  currency: string;
  unitAmount: number;
  interval: "day" | "week" | "month" | "year" | null;
  intervalCount: number | null;
  trialPeriodDays: number | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Subscription specific types
export interface SubscriptionFilters extends FilterConfig {
  userId?: string;
  productId?: string;
  status?: string;
}

export interface SubscriptionTableData {
  id: string;
  userId: string;
  priceId: string;
  stripeSubscriptionId: string;
  status:
    | "active"
    | "canceled"
    | "incomplete"
    | "incomplete_expired"
    | "past_due"
    | "trialing"
    | "unpaid"
    | "paused";
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  endedAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  price?: {
    id: string;
    unitAmount: number;
    currency: string;
    interval: "day" | "week" | "month" | "year" | null;
    product?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}
