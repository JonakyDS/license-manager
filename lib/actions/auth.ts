"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { ActionResult } from "@/lib/types/admin";

export async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export async function requireAdmin(): Promise<
  ActionResult<never> | { success: true }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      message: "Unauthorized: You must be logged in",
    };
  }

  if (user.role !== "admin") {
    return {
      success: false,
      message: "Forbidden: Admin access required",
    };
  }

  return { success: true };
}
