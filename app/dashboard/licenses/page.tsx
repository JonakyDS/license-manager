import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { license, licenseActivation, subscription } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Key,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "./copy-button";

async function getUserLicenses(userEmail: string) {
  // Get licenses associated with user's email
  const licenses = await db.query.license.findMany({
    where: eq(license.customerEmail, userEmail),
    with: {
      product: true,
      activations: {
        where: eq(licenseActivation.isActive, true),
      },
    },
    orderBy: (license, { desc }) => [desc(license.createdAt)],
  });

  return licenses;
}

async function getSubscriptionProducts(userId: string) {
  // Get products from active subscriptions
  const subs = await db.query.subscription.findMany({
    where: and(
      eq(subscription.userId, userId),
      or(eq(subscription.status, "active"), eq(subscription.status, "trialing"))
    ),
    with: {
      price: {
        with: {
          product: true,
        },
      },
    },
  });

  return subs.map((s) => s.price?.product).filter(Boolean);
}

export default async function LicensesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const licenses = await getUserLicenses(session.user.email);
  const subscribedProducts = await getSubscriptionProducts(session.user.id);

  const formatDate = (date: Date | null) => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <ShieldCheck className="mr-1 h-3 w-3" />
            Active
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary">
            <ShieldAlert className="mr-1 h-3 w-3" />
            Expired
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            <ShieldAlert className="mr-1 h-3 w-3" />
            Revoked
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">License Keys</h1>
          <p className="text-muted-foreground">
            Manage your license keys and domain activations
          </p>
        </div>
      </div>

      {/* Active Subscriptions Info */}
      {subscribedProducts.length > 0 && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <ShieldCheck className="h-5 w-5" />
              Active Subscription Access
            </CardTitle>
            <CardDescription className="text-green-600 dark:text-green-400">
              You have active subscriptions for the following products:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {subscribedProducts.map((product, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                >
                  {product?.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Licenses List */}
      {licenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Key className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">
              No license keys found
            </h3>
            <p className="text-muted-foreground mb-4 text-center">
              License keys will appear here when you purchase a product. If you
              have a subscription, licenses are managed automatically.
            </p>
            <Button asChild>
              <Link href="/products">Browse Products</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {licenses.map((lic) => (
            <Card key={lic.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-lg font-bold">
                    <Key className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>{lic.product.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <code className="bg-muted rounded px-2 py-1 text-xs">
                        {lic.licenseKey.slice(0, 8)}...
                        {lic.licenseKey.slice(-8)}
                      </code>
                      <CopyButton value={lic.licenseKey} />
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(lic.status)}
              </CardHeader>
              <CardContent className="space-y-6">
                {/* License Details */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Created
                    </p>
                    <p className="font-semibold">{formatDate(lic.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Expires
                    </p>
                    <p className="font-semibold">{formatDate(lic.expiresAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Validity
                    </p>
                    <p className="font-semibold">{lic.validityDays} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">
                      Domain Changes
                    </p>
                    <p className="font-semibold">
                      {lic.domainChangesUsed} / {lic.maxDomainChanges} used
                    </p>
                  </div>
                </div>

                {/* Active Domains */}
                {lic.activations.length > 0 && (
                  <div>
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <Globe className="h-4 w-4" />
                      Active Domains ({lic.activations.length})
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Activated</TableHead>
                          <TableHead>IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lic.activations.map((activation) => (
                          <TableRow key={activation.id}>
                            <TableCell className="font-mono">
                              {activation.domain}
                            </TableCell>
                            <TableCell>
                              {formatDate(activation.activatedAt)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {activation.ipAddress || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Full License Key (hidden by default) */}
                <div className="bg-muted/50 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Full License Key</p>
                      <p className="text-muted-foreground text-xs">
                        Copy this key and use it in your WordPress site
                      </p>
                    </div>
                    <CopyButton
                      value={lic.licenseKey}
                      label="Copy Key"
                      showLabel
                    />
                  </div>
                  <pre className="mt-2 overflow-x-auto rounded bg-black/5 p-3 text-xs dark:bg-white/5">
                    {lic.licenseKey}
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use License Keys</CardTitle>
          <CardDescription>
            Follow these steps to activate your license
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-inside list-decimal space-y-3 text-sm">
            <li>Install the plugin or theme on your WordPress site</li>
            <li>Navigate to the plugin/theme settings page</li>
            <li>Enter your license key in the activation field</li>
            <li>Click &quot;Activate&quot; to complete the process</li>
          </ol>
          <div className="flex gap-4 pt-4">
            <Button variant="outline" asChild>
              <Link href="/docs">
                <ExternalLink className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/support">
                <ExternalLink className="mr-2 h-4 w-4" />
                Get Support
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
