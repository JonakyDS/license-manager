/**
 * Cron Job: Sync Stripe Subscriptions
 *
 * This endpoint is called by Vercel Cron to periodically sync
 * subscription data from Stripe to ensure database consistency.
 *
 * Schedule: Every 6 hours (configured in vercel.json)
 */

import { NextResponse } from "next/server";
import { syncAllSubscriptions } from "@/lib/actions/sync-stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max for sync

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization");

  // In production, verify the CRON_SECRET
  if (process.env.NODE_ENV === "production") {
    if (!process.env.CRON_SECRET) {
      console.error("CRON_SECRET is not configured");
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("Invalid cron authorization");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  console.log("Starting scheduled subscription sync...");

  try {
    const result = await syncAllSubscriptions();

    console.log("Sync completed:", result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("Sync failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
