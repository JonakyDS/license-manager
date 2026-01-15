import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

function isSuperAdmin(email: string): boolean {
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  return (
    !!superAdminEmail && email.toLowerCase() === superAdminEmail.toLowerCase()
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Redirect to sign-in if not authenticated
  if (!session) {
    redirect("/sign-in");
  }

  // Redirect to dashboard if not an admin or super admin
  if (session.user.role !== "admin" && !isSuperAdmin(session.user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-muted/30 fixed inset-0 flex overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <AdminHeader />

        {/* Page Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="container mx-auto p-4 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
