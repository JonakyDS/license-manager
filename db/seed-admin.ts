import "dotenv/config";
import { db } from "./drizzle";
import { user, account } from "./schema";
import { eq } from "drizzle-orm";

// Use the auth API to create admin user with proper password hashing
async function createAdmin() {
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";

  console.log("🔐 Creating admin user via auth API...\n");

  // First, delete any existing admin user
  console.log("🧹 Removing existing admin user if exists...");
  await db
    .delete(account)
    .where(
      eq(
        account.userId,
        db
          .select({ id: user.id })
          .from(user)
          .where(eq(user.email, "admin@example.com"))
      )
    );
  await db.delete(user).where(eq(user.email, "admin@example.com"));
  console.log("✅ Cleared existing admin user\n");

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
      },
      body: JSON.stringify({
        name: "Admin User",
        email: "admin@example.com",
        password: "admin123",
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Admin user created successfully!");
      console.log("   Email: admin@example.com");
      console.log("   Password: admin123");

      // Now update the user role to admin
      const { db } = await import("./drizzle");
      const { user } = await import("./schema");
      const { eq } = await import("drizzle-orm");

      await db
        .update(user)
        .set({ role: "admin" })
        .where(eq(user.email, "admin@example.com"));

      console.log("   Role: admin ✅");
    } else {
      console.log("Response:", data);
      if (
        data.message?.includes("already exists") ||
        data.code === "USER_ALREADY_EXISTS"
      ) {
        console.log("ℹ️  Admin user already exists. Try logging in with:");
        console.log("   Email: admin@example.com");
        console.log("   Password: admin123");
      } else {
        console.error("❌ Failed to create admin:", data.message || data);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    console.log("\n⚠️  Make sure the dev server is running (npm run dev)");
  }
}

createAdmin();
