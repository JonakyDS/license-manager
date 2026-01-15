"use server";

/**
 * Authentication utilities for server actions
 *
 * Provides centralized authentication and authorization helpers
 * for admin panel operations.
 */

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type {
  AuthenticatedUser,
  AdminCheckResult,
  AdminCheckFailure,
} from "@/lib/types/auth";

// Re-export types for convenience
export type {
  AuthenticatedUser,
  AdminCheckResult,
  AdminCheckFailure,
} from "@/lib/types/auth";

// =============================================================================
// SUPER ADMIN CHECK
// =============================================================================

/**
 * Checks if a user email is the super admin
 * Super admin email is defined in SUPER_ADMIN_EMAIL env variable
 * Note: Not exported because Server Actions must be async
 */
function isSuperAdmin(email: string): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  return (
    !!superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase()
  );
}

// =============================================================================
// AUTH FUNCTIONS
// =============================================================================

/**
 * Gets the current authenticated user from the session
 *
 * @returns The authenticated user or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user as AuthenticatedUser | null;
}

/**
 * Requires the current user to be an authenticated admin or super admin
 *
 * Use this at the start of any admin-only server action.
 * Returns the authenticated user on success for use in the action.
 *
 * Super admin is determined by SUPER_ADMIN_EMAIL env variable.
 *
 * @example
 * ```ts
 * export async function deleteUser(id: string) {
 *   const adminCheck = await requireAdmin();
 *   if (!adminCheck.success) {
 *     return adminCheck; // Returns the failure result
 *   }
 *
 *   // adminCheck.user is available here
 *   console.log(`Admin ${adminCheck.user.email} is deleting user ${id}`);
 * }
 * ```
 */
export async function requireAdmin(): Promise<
  AdminCheckResult | AdminCheckFailure
> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, message: "Unauthorized: You must be logged in" };
  }

  // Check if user is admin role OR super admin by email
  if (user.role !== "admin" && !isSuperAdmin(user.email)) {
    return { success: false, message: "Forbidden: Admin access required" };
  }

  return { success: true, user };
}

/**
 * Checks if the current user is authenticated (any role)
 *
 * @returns Authentication check result with user data on success
 */
export async function requireAuth(): Promise<
  AdminCheckResult | AdminCheckFailure
> {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, message: "Unauthorized: You must be logged in" };
  }

  return { success: true, user };
}
