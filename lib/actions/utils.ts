/**
 * Server Action Utilities
 *
 * Provides reusable utilities for server actions including:
 * - Result builders for consistent ActionResult responses
 * - FormData parsing utilities
 * - Error handling wrappers
 * - Pagination helpers
 */

import type { ActionResult, PaginationConfig } from "@/lib/types/admin";

// =============================================================================
// RESULT BUILDERS
// =============================================================================

/**
 * Creates a successful ActionResult with data
 */
export function success<T>(data: T, message?: string): ActionResult<T> {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Creates a successful ActionResult without data
 */
export function ok(message?: string): ActionResult {
  return {
    success: true,
    message,
  };
}

/**
 * Creates a failed ActionResult
 */
export function failure(
  message: string,
  errors?: Record<string, string[]>
): ActionResult<never> {
  return {
    success: false,
    message,
    errors,
  };
}

/**
 * Creates a not found ActionResult
 */
export function notFound(entity: string): ActionResult<never> {
  return failure(`${entity} not found`);
}

/**
 * Creates an unauthorized ActionResult
 */
export function unauthorized(
  message = "Unauthorized: You must be logged in"
): ActionResult<never> {
  return failure(message);
}

/**
 * Creates a forbidden ActionResult
 */
export function forbidden(
  message = "Forbidden: Admin access required"
): ActionResult<never> {
  return failure(message);
}

/**
 * Creates a validation error ActionResult from Zod error
 */
export function validationError(
  errors: Record<string, string[]>
): ActionResult<never> {
  return failure("Validation failed", errors);
}

// =============================================================================
// FORMDATA UTILITIES
// =============================================================================

/**
 * Type-safe FormData getter with automatic trimming
 */
export function getFormField(formData: FormData, key: string): string {
  const value = formData.get(key) as string;
  return value?.trim() ?? "";
}

/**
 * Gets optional string field from FormData with automatic trimming
 */
export function getOptionalField(
  formData: FormData,
  key: string
): string | undefined {
  const value = (formData.get(key) as string)?.trim();
  return value || undefined;
}

/**
 * Gets boolean field from FormData
 */
export function getBooleanField(formData: FormData, key: string): boolean {
  return formData.get(key) === "true";
}

/**
 * Parses FormData to object with specified keys
 */
export function parseFormData<T extends Record<string, unknown>>(
  formData: FormData,
  fields: Array<keyof T & string>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const field of fields) {
    result[field] = getFormField(formData, field);
  }
  return result;
}

// =============================================================================
// PAGINATION UTILITIES
// =============================================================================

/**
 * Calculates pagination metadata
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationConfig {
  return {
    page,
    pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / pageSize),
  };
}

/**
 * Calculates offset for database queries
 */
export function calculateOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Wraps an async function with error handling and returns ActionResult
 *
 * @example
 * ```ts
 * const result = await withErrorHandling(
 *   async () => {
 *     const data = await db.query.user.findFirst({ where: eq(user.id, id) });
 *     if (!data) return notFound("User");
 *     return success(data);
 *   },
 *   "Failed to fetch user"
 * );
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<ActionResult<T>>,
  errorMessage: string,
  logError = true
): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (error) {
    if (logError) {
      console.error(`${errorMessage}:`, error);
    }
    return failure(errorMessage);
  }
}

// =============================================================================
// CRYPTO UTILITIES
// =============================================================================

/**
 * Generates a license key in format XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segments: string[] = [];

  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    segments.push(segment);
  }

  return segments.join("-");
}

/**
 * Generates a unique ID using crypto
 */
export function generateId(): string {
  return crypto.randomUUID();
}
