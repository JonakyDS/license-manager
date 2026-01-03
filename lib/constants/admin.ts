// Admin panel constants

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];

export const USER_ROLES = [
  { value: "user", label: "User" },
  { value: "admin", label: "Admin" },
] as const;

export const USER_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "verified", label: "Verified" },
  { value: "unverified", label: "Unverified" },
] as const;

export const PRODUCT_TYPES = [
  { value: "plugin", label: "Plugin" },
  { value: "theme", label: "Theme" },
  { value: "source_code", label: "Source Code" },
  { value: "other", label: "Other" },
] as const;

export const LICENSE_STATUS = [
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "revoked", label: "Revoked" },
] as const;
