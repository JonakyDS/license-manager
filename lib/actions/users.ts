"use server";

import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { eq, ilike, or, count, desc, asc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type {
  ActionResult,
  UserTableData,
  UserFilters,
  PaginationConfig,
} from "@/lib/types/admin";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/admin";

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
});

const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
  emailVerified: z.boolean().optional(),
});

// Get users with pagination, search, and filters
export async function getUsers(
  filters: UserFilters = {},
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sortColumn: string = "createdAt",
  sortDirection: "asc" | "desc" = "desc"
): Promise<{
  users: UserTableData[];
  pagination: PaginationConfig;
}> {
  const offset = (page - 1) * pageSize;

  // Build where conditions
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get sort order
  const sortOrder = sortDirection === "asc" ? asc : desc;
  const sortField =
    sortColumn === "name"
      ? user.name
      : sortColumn === "email"
        ? user.email
        : sortColumn === "role"
          ? user.role
          : sortColumn === "emailVerified"
            ? user.emailVerified
            : user.createdAt;

  // Execute queries
  const [users, totalResult] = await Promise.all([
    db
      .select()
      .from(user)
      .where(whereClause)
      .orderBy(sortOrder(sortField))
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() }).from(user).where(whereClause),
  ]);

  const totalItems = totalResult[0]?.count ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    users: users as UserTableData[],
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  };
}

// Get single user by ID
export async function getUserById(
  id: string
): Promise<ActionResult<UserTableData>> {
  try {
    const result = await db.select().from(user).where(eq(user.id, id)).limit(1);

    if (result.length === 0) {
      return { success: false, message: "User not found" };
    }

    return { success: true, data: result[0] as UserTableData };
  } catch (error) {
    console.error("Error fetching user:", error);
    return { success: false, message: "Failed to fetch user" };
  }
}

// Create a new user (admin-only, without password - just metadata)
export async function createUser(
  formData: FormData
): Promise<ActionResult<UserTableData>> {
  try {
    const rawData = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "user" | "admin",
    };

    const validatedData = createUserSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Check if email already exists
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, validatedData.data.email))
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        message: "A user with this email already exists",
      };
    }

    const newUser = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: validatedData.data.name,
        email: validatedData.data.email,
        role: validatedData.data.role,
        emailVerified: false,
      })
      .returning();

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "User created successfully",
      data: newUser[0] as UserTableData,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: "Failed to create user" };
  }
}

// Update an existing user
export async function updateUser(
  formData: FormData
): Promise<ActionResult<UserTableData>> {
  try {
    const rawData = {
      id: formData.get("id") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      role: formData.get("role") as "user" | "admin",
      emailVerified: formData.get("emailVerified") === "true",
    };

    const validatedData = updateUserSchema.safeParse(rawData);

    if (!validatedData.success) {
      return {
        success: false,
        message: "Validation failed",
        errors: validatedData.error.flatten().fieldErrors,
      };
    }

    // Check if email is taken by another user
    const existingUser = await db
      .select()
      .from(user)
      .where(
        and(
          eq(user.email, validatedData.data.email),
          sql`${user.id} != ${validatedData.data.id}`
        )
      )
      .limit(1);

    if (existingUser.length > 0) {
      return {
        success: false,
        message: "A user with this email already exists",
      };
    }

    const updatedUser = await db
      .update(user)
      .set({
        name: validatedData.data.name,
        email: validatedData.data.email,
        role: validatedData.data.role,
        emailVerified: validatedData.data.emailVerified,
      })
      .where(eq(user.id, validatedData.data.id))
      .returning();

    if (updatedUser.length === 0) {
      return { success: false, message: "User not found" };
    }

    revalidatePath("/admin/users");

    return {
      success: true,
      message: "User updated successfully",
      data: updatedUser[0] as UserTableData,
    };
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, message: "Failed to update user" };
  }
}

// Delete a user
export async function deleteUser(id: string): Promise<ActionResult> {
  try {
    const deletedUser = await db
      .delete(user)
      .where(eq(user.id, id))
      .returning();

    if (deletedUser.length === 0) {
      return { success: false, message: "User not found" };
    }

    revalidatePath("/admin/users");

    return { success: true, message: "User deleted successfully" };
  } catch (error) {
    console.error("Error deleting user:", error);
    return { success: false, message: "Failed to delete user" };
  }
}

// Delete multiple users
export async function deleteUsers(ids: string[]): Promise<ActionResult> {
  try {
    if (ids.length === 0) {
      return { success: false, message: "No users selected" };
    }

    for (const id of ids) {
      await db.delete(user).where(eq(user.id, id));
    }

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `${ids.length} user(s) deleted successfully`,
    };
  } catch (error) {
    console.error("Error deleting users:", error);
    return { success: false, message: "Failed to delete users" };
  }
}

// Get user statistics
export async function getUserStats(): Promise<{
  total: number;
  admins: number;
  verified: number;
  unverified: number;
}> {
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

  return {
    total,
    admins,
    verified,
    unverified: total - verified,
  };
}
