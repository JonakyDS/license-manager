/**
 * Admin API: Manual Stripe Sync
 *
 * Allows admins to manually trigger a full sync of Stripe subscriptions.
 * Useful for initial setup or recovering from webhook issues.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { syncAllSubscriptions } from "@/lib/actions/sync-stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max

export async function POST() {
  try {
    // Check if user is authenticated and is admin
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`Admin ${session.user.email} triggered manual sync`);

    const result = await syncAllSubscriptions();

    return NextResponse.json({
      success: true,
      message: "Sync completed",
      result,
    });
  } catch (error) {
    console.error("Manual sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
