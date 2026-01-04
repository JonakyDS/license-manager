/**
 * License API Types
 *
 * Shared type definitions for all license API endpoints.
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// Error Codes
// ============================================================================

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "LICENSE_NOT_FOUND"
  | "LICENSE_EXPIRED"
  | "LICENSE_REVOKED"
  | "LICENSE_INACTIVE"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "DOMAIN_MISMATCH"
  | "DOMAIN_CHANGE_LIMIT_EXCEEDED"
  | "ALREADY_ACTIVATED"
  | "NOT_ACTIVATED"
  | "ACTIVATION_NOT_FOUND"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

// ============================================================================
// Request Types
// ============================================================================

export interface ActivateRequest {
  license_key: string;
  product_slug: string;
  domain: string;
}

export interface ValidateRequest {
  license_key: string;
  product_slug: string;
  domain: string;
}

export interface DeactivateRequest {
  license_key: string;
  product_slug: string;
  domain: string;
  reason?: string;
}

export interface StatusRequest {
  license_key: string;
  product_slug: string;
}

// ============================================================================
// Response Data Types
// ============================================================================

export interface ActivateResponseData {
  license_key: string;
  domain: string;
  activated_at: string;
  expires_at: string | null;
  days_remaining: number | null;
  is_new_activation: boolean;
  domain_changes_remaining: number;
  product: {
    name: string;
    slug: string;
    type: string;
  };
  customer: {
    name: string | null;
    email: string | null;
  };
}

export interface ValidateResponseData {
  valid: boolean;
  license_key: string;
  domain: string;
  status: "active" | "expired" | "revoked";
  activated_at: string | null;
  expires_at: string | null;
  days_remaining: number | null;
  product: {
    name: string;
    slug: string;
    type: string;
  };
}

export interface DeactivateResponseData {
  license_key: string;
  domain: string;
  deactivated_at: string;
  reason: string | null;
  domain_changes_remaining: number;
}

export interface StatusResponseData {
  license_key: string;
  status: "active" | "expired" | "revoked";
  customer: {
    name: string | null;
    email: string | null;
  };
  product: {
    name: string;
    slug: string;
    type: string;
  };
  activation: {
    is_activated: boolean;
    domain: string | null;
    activated_at: string | null;
  };
  validity: {
    validity_days: number;
    expires_at: string | null;
    days_remaining: number | null;
    is_expired: boolean;
  };
  domain_changes: {
    max_allowed: number;
    used: number;
    remaining: number;
  };
  timestamps: {
    created_at: string;
    updated_at: string;
  };
}

// ============================================================================
// Nalda CSV Upload Request Types
// ============================================================================

export interface NaldaCsvUploadRequest {
  license_key: string;
  domain: string;
  sftp_host: string;
  sftp_port: number;
  sftp_username: string;
  sftp_password: string;
  csv_file_key: string;
}

export interface NaldaCsvUploadRequestResponseData {
  id: string;
  license_id: string;
  domain: string;
  csv_file_key: string;
  status: "pending" | "processing" | "processed" | "failed";
  created_at: string;
}

export interface NaldaCsvUploadRequestListItem {
  id: string;
  domain: string;
  csv_file_key: string;
  status: "pending" | "processing" | "processed" | "failed";
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface NaldaCsvUploadRequestListResponseData {
  requests: NaldaCsvUploadRequestListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
