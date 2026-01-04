import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
