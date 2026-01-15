import Link from "next/link";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  type: "plugin" | "theme" | "source_code" | "other";
  features?: string[];
  image?: string;
  startingPrice?: number;
  currency?: string;
  interval?: string;
  popular?: boolean;
}

const typeLabels = {
  plugin: "Plugin",
  theme: "Theme",
  source_code: "Source Code",
  other: "Product",
};

const typeColors = {
  plugin: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  theme: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  source_code: "bg-green-500/10 text-green-600 dark:text-green-400",
  other: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export function ProductCard({
  name,
  slug,
  description,
  type,
  features,
  startingPrice,
  currency = "usd",
  interval,
  popular,
}: ProductCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price / 100);
  };

  // Parse features if it's a JSON string
  const featureList = features
    ? typeof features === "string"
      ? JSON.parse(features)
      : features
    : [];

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl",
        popular && "ring-primary ring-2"
      )}
    >
      {popular && (
        <Badge className="absolute top-4 right-4 z-10">Popular</Badge>
      )}

      {/* Product Image Placeholder */}
      <div className="from-primary/5 to-primary/10 relative h-48 overflow-hidden bg-gradient-to-br">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-primary/20 text-6xl font-bold">
            {name.charAt(0)}
          </div>
        </div>
        <div className="from-background/80 absolute inset-0 bg-gradient-to-t to-transparent" />
        <Badge
          variant="secondary"
          className={cn("absolute bottom-4 left-4", typeColors[type])}
        >
          {typeLabels[type]}
        </Badge>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="group-hover:text-primary line-clamp-1 text-xl transition-colors">
          {name}
        </CardTitle>
        {description && (
          <CardDescription className="line-clamp-2">
            {description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        {featureList.length > 0 && (
          <ul className="space-y-2">
            {featureList.slice(0, 4).map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
            {featureList.length > 4 && (
              <li className="text-muted-foreground text-sm">
                +{featureList.length - 4} more features
              </li>
            )}
          </ul>
        )}
      </CardContent>

      <CardFooter className="bg-muted/30 flex items-center justify-between gap-4 border-t pt-4">
        {startingPrice !== undefined ? (
          <div>
            <span className="text-muted-foreground text-sm">From </span>
            <span className="text-2xl font-bold">
              {formatPrice(startingPrice)}
            </span>
            {interval && (
              <span className="text-muted-foreground text-sm">/{interval}</span>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            Contact for pricing
          </div>
        )}
        <Button asChild>
          <Link href={`/products/${slug}`}>
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

interface ProductGridProps {
  products: ProductCardProps[];
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No products available yet.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} {...product} />
      ))}
    </div>
  );
}
