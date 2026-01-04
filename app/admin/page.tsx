import { Suspense } from "react";
import Link from "next/link";
import { PageHeader, StatCard } from "@/components/admin";
import { getUserStats } from "@/lib/actions/users";
import { getProductStats } from "@/lib/actions/products";
import { getLicenseStats } from "@/lib/actions/licenses";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UsersIcon,
  ShieldCheckIcon,
  MailCheckIcon,
  MailXIcon,
  ArrowRightIcon,
  PackageIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  TagIcon,
} from "lucide-react";

export const metadata = {
  title: "Admin Overview",
};

async function UserStatsCards() {
  const stats = await getUserStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Users"
        value={stats.total}
        icon={<UsersIcon className="size-4" />}
        description="All registered users"
      />
      <StatCard
        title="Admins"
        value={stats.admins}
        icon={<ShieldCheckIcon className="size-4" />}
        description="Users with admin privileges"
      />
      <StatCard
        title="Verified"
        value={stats.verified}
        icon={<MailCheckIcon className="size-4" />}
        description="Email verified users"
      />
      <StatCard
        title="Unverified"
        value={stats.unverified}
        icon={<MailXIcon className="size-4" />}
        description="Pending verification"
      />
    </div>
  );
}

async function ProductStatsCards() {
  const stats = await getProductStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Products"
        value={stats.total}
        icon={<PackageIcon className="size-4" />}
        description="All digital products"
      />
      <StatCard
        title="Active"
        value={stats.active}
        icon={<CheckCircleIcon className="size-4" />}
        description="Active products"
      />
      <StatCard
        title="Inactive"
        value={stats.inactive}
        icon={<XCircleIcon className="size-4" />}
        description="Inactive products"
      />
      <StatCard
        title="By Type"
        value={Object.keys(stats.byType).length}
        icon={<TagIcon className="size-4" />}
        description="Product categories"
      />
    </div>
  );
}

async function LicenseStatsCards() {
  const stats = await getLicenseStats();

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Licenses"
        value={stats.total}
        icon={<KeyIcon className="size-4" />}
        description="All generated licenses"
      />
      <StatCard
        title="Active"
        value={stats.active}
        icon={<CheckCircleIcon className="size-4" />}
        description="Currently active licenses"
      />
      <StatCard
        title="Expired"
        value={stats.expired}
        icon={<XCircleIcon className="size-4" />}
        description="Expired licenses"
      />
      <StatCard
        title="Revoked"
        value={stats.revoked}
        icon={<XCircleIcon className="size-4" />}
        description="Manually revoked"
      />
    </div>
  );
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard key={i} title="" value="" isLoading />
      ))}
    </div>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Overview"
        description="Welcome to the admin panel. Manage your users, products, and licenses."
      />

      {/* User Stats */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">User Statistics</h2>
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <UserStatsCards />
        </Suspense>
      </section>

      {/* Product Stats */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Product Statistics</h2>
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <ProductStatsCards />
        </Suspense>
      </section>

      {/* License Stats */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">License Statistics</h2>
        <Suspense fallback={<StatsLoadingSkeleton />}>
          <LicenseStatsCards />
        </Suspense>
      </section>

      {/* Quick Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <UsersIcon className="size-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View, create, edit, and delete users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/users">
                  Manage Users
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageIcon className="size-5" />
                Product Management
              </CardTitle>
              <CardDescription>Manage your digital products</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/products">
                  Manage Products
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyIcon className="size-5" />
                License Management
              </CardTitle>
              <CardDescription>
                View and manage software licenses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/admin/licenses">
                  Manage Licenses
                  <ArrowRightIcon className="ml-2 size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
