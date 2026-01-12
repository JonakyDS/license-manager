/**
 * Authentication Types
 *
 * Type definitions and type guards for authentication.
 * These are shared between client and server.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  image: string | null;
  emailVerified: boolean;
}

export interface AdminCheckResult {
  success: true;
  user: AuthenticatedUser;
}

export interface AdminCheckFailure {
  success: false;
  message: string;
}

export type AdminCheckResponse = AdminCheckResult | AdminCheckFailure;

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if admin check was successful
 */
export function isAdminCheckSuccess(
  result: AdminCheckResponse
): result is AdminCheckResult {
  return result.success === true;
}
