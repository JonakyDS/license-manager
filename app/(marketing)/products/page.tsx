import type { Metadata } from "next";
import { db } from "@/db/drizzle";
import { product, price } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ProductGrid, type ProductCardProps } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Products",
  description: "Browse our collection of premium WordPress plugins and themes",
};

async function getProducts(): Promise<ProductCardProps[]> {
  const products = await db.query.product.findMany({
    where: eq(product.active, true),
    with: {
      prices: {
        where: eq(price.active, true),
        orderBy: asc(price.unitAmount),
        limit: 1,
      },
    },
    orderBy: asc(product.name),
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    type: p.type,
    features: p.features ? JSON.parse(p.features) : undefined,
    startingPrice: p.prices[0]?.unitAmount,
    currency: p.prices[0]?.currency,
    interval: p.prices[0]?.interval ?? undefined,
  }));
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Our Products
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Premium WordPress plugins and themes designed to help you succeed.
            All products include automatic updates, priority support, and a
            14-day money-back guarantee.
          </p>
        </div>

        {/* Products Grid */}
        <div className="mt-16">
          <ProductGrid products={products} />
        </div>

        {/* Empty State */}
        {products.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-muted-foreground text-lg">
              No products available at the moment. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
