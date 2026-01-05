import { Shield, PackageIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-b p-4">
      <div className="max-w-4xl space-y-8 text-center">
        <div className="flex justify-center">
          <div className="bg-primary/10 rounded-full p-4">
            <Shield className="text-primary h-16 w-16" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            License Management Server
          </h1>
          <p className="text-muted-foreground text-xl">
            This is the official license management server for our plugins and
            themes.
          </p>
        </div>

        {/* Products Section */}
        <div className="pt-8">
          <h2 className="mb-6 text-2xl font-semibold">Our Products</h2>
          <div className="grid gap-6 md:grid-cols-1">
            <Card className="text-left">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <PackageIcon className="text-primary h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>WooCommerce Nalda Sync</CardTitle>
                    <CardDescription>
                      Connect your WooCommerce store to Nalda Marketplace
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">
                  Automatically sync products from WooCommerce to Nalda
                  marketplace and import orders back. Save time, reduce errors,
                  and grow your Swiss e-commerce business.
                </p>
                <Button asChild>
                  <Link href="/woocommerce-nalda-sync">Learn More</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="border-border border-t pt-4">
          <p className="text-muted-foreground text-sm">
            For API documentation, please refer to our developer resources.
          </p>
        </div>
      </div>
    </div>
  );
}
