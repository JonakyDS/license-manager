"use server";

/**
 * User Management Server Actions
 *
 * Provides CRUD operations for user management in the admin panel.
 * All actions require admin authentication.
 */

import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "./auth";
import {
  success,
  ok,
  failure,
  notFound,
  validationError,
  withErrorHandling,
  calculatePagination,
  calculateOffset,
  getFormField,
  getBooleanField,
  generateId,
} from "./utils";
import { userSchema } from "@/lib/validations/admin";
import type {
  ActionResult,
  UserTableData,
  UserFilters,
  PaginationConfig,
  SortDirection,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// =============================================================================
// CONSTANTS
// =============================================================================

const REVALIDATION_PATH = "/admin/users";

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds sort configuration for user queries
 */
function getUserSortField(sortColumn: string) {
  switch (sortColumn) {
    case "name":
      return user.name;
    case "email":
      return user.email;
    case "role":
      return user.role;
    case "emailVerified":
      return user.emailVerified;
    default:
      return user.createdAt;
  }
}

/**
 * Builds where conditions for user queries
 */
function buildUserWhereConditions(filters: UserFilters) {
  const conditions = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(user.name, `%${filters.search}%`),
        ilike(user.email, `%${filters.search}%`)
      )
    );
  }

  if (filters.role && filters.role !== "all") {
    conditions.push(eq(user.role, filters.role as "user" | "admin"));
  }

  if (filters.status === "verified") {
    conditions.push(eq(user.emailVerified, true));
  } else if (filters.status === "unverified") {
    conditions.push(eq(user.emailVerified, false));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Retrieves paginated list of users with filtering and sorting
 */
export async function getUsers(
  filters: UserFilters = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  sortColumn = "createdAt",
  sortDirection: SortDirection = "desc"
): Promise<
  ActionResult<{ users: UserTableData[]; pagination: PaginationConfig }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const whereClause = buildUserWhereConditions(filters);
    const sortOrder = sortDirection === "asc" ? asc : desc;
    const sortField = getUserSortField(sortColumn);

    const [users, totalResult] = await Promise.all([
      db.query.user.findMany({
        where: whereClause,
        orderBy: sortOrder(sortField),
        limit: pageSize,
        offset: calculateOffset(page, pageSize),
      }),
      db.select({ count: count() }).from(user).where(whereClause),
    ]);

    const totalItems = totalResult[0]?.count ?? 0;

    return success({
      users: users as UserTableData[],
      pagination: calculatePagination(page, pageSize, totalItems),
    });
  }, "Failed to fetch users");
}

/**
 * Retrieves a single user by ID
 */
export async function getUserById(
  id: string
): Promise<ActionResult<UserTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const result = await db.query.user.findFirst({
      where: eq(user.id, id),
    });

    if (!result) return notFound("User");

    return success(result as UserTableData);
  }, "Failed to fetch user");
}

/**
 * Gets aggregated user statistics
 */
export async function getUserStats(): Promise<
  ActionResult<{
    total: number;
    admins: number;
    verified: number;
    unverified: number;
  }>
> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [totalResult, adminResult, verifiedResult] = await Promise.all([
      db.select({ count: count() }).from(user),
      db.select({ count: count() }).from(user).where(eq(user.role, "admin")),
      db
        .select({ count: count() })
        .from(user)
        .where(eq(user.emailVerified, true)),
    ]);

    const total = totalResult[0]?.count ?? 0;
    const admins = adminResult[0]?.count ?? 0;
    const verified = verifiedResult[0]?.count ?? 0;

    return success({
      total,
      admins,
      verified,
      unverified: total - verified,
    });
  }, "Failed to fetch user statistics");
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Creates a new user (admin-only, without password)
 */
export async function createUser(
  formData: FormData
): Promise<ActionResult<UserTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      name: getFormField(formData, "name"),
      email: getFormField(formData, "email"),
      role: getFormField(formData, "role") as "user" | "admin",
    };

    const validated = userSchema.create.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Check for existing email
    const existingUser = await db.query.user.findFirst({
      where: eq(user.email, validated.data.email),
    });

    if (existingUser) {
      return failure("A user with this email already exists");
    }

    const [newUser] = await db
      .insert(user)
      .values({
        id: generateId(),
        name: validated.data.name,
        email: validated.data.email,
        role: validated.data.role,
        emailVerified: false,
      })
      .returning();

    revalidatePath(REVALIDATION_PATH);

    return success(newUser as UserTableData, "User created successfully");
  }, "Failed to create user");
}

/**
 * Updates an existing user
 */
export async function updateUser(
  formData: FormData
): Promise<ActionResult<UserTableData>> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const rawData = {
      id: getFormField(formData, "id"),
      name: getFormField(formData, "name"),
      email: getFormField(formData, "email"),
      role: getFormField(formData, "role") as "user" | "admin",
      emailVerified: getBooleanField(formData, "emailVerified"),
    };

    const validated = userSchema.update.safeParse(rawData);
    if (!validated.success) {
      return validationError(validated.error.flatten().fieldErrors);
    }

    // Check if email is taken by another user
    const existingUser = await db.query.user.findFirst({
      where: and(
        eq(user.email, validated.data.email),
        sql`${user.id} != ${validated.data.id}`
      ),
    });

    if (existingUser) {
      return failure("A user with this email already exists");
    }

    const [updatedUser] = await db
      .update(user)
      .set({
        name: validated.data.name,
        email: validated.data.email,
        role: validated.data.role,
        emailVerified: validated.data.emailVerified,
      })
      .where(eq(user.id, validated.data.id))
      .returning();

    if (!updatedUser) return notFound("User");

    revalidatePath(REVALIDATION_PATH);

    return success(updatedUser as UserTableData, "User updated successfully");
  }, "Failed to update user");
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Deletes a single user by ID
 */
export async function deleteUser(id: string): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();

    if (!deletedUser) return notFound("User");

    revalidatePath(REVALIDATION_PATH);

    return ok("User deleted successfully");
  }, "Failed to delete user");
}

/**
 * Deletes multiple users by IDs
 */
export async function deleteUsers(ids: string[]): Promise<ActionResult> {
  const adminCheck = await requireAdmin();
  if (!adminCheck.success) return adminCheck;

  return withErrorHandling(async () => {
    if (ids.length === 0) {
      return failure("No users selected");
    }

    // Use transaction for bulk delete
    await Promise.all(ids.map((id) => db.delete(user).where(eq(user.id, id))));

    revalidatePath(REVALIDATION_PATH);

    return ok(`${ids.length} user(s) deleted successfully`);
  }, "Failed to delete users");
}
