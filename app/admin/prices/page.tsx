"use server";

import { Suspense } from "react";
import { PageHeader } from "@/components/admin";
import { PricesClient } from "./prices-client";
import { getPrices } from "@/lib/actions/prices";
import { getProducts } from "@/lib/actions/products";
import type { SortDirection, PriceFilters } from "@/lib/types/admin";

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    sortColumn?: string;
    sortDirection?: string;
    search?: string;
    productId?: string;
    type?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;

  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;
  const sortColumn = params.sortColumn || "createdAt";
  const sortDirection = (params.sortDirection as SortDirection) || "desc";
  const filters: PriceFilters = {
    search: params.search,
    productId: params.productId,
    type: params.type,
    status: params.status,
  };

  const [pricesResult, productsResult] = await Promise.all([
    getPrices({ filters, page, pageSize, sortColumn, sortDirection }),
    getProducts({}, 1, 100), // Get all products for filter dropdown (positional args)
  ]);

  const prices = pricesResult.success ? (pricesResult.data ?? null) : null;
  const products = productsResult.success
    ? productsResult.data?.products || []
    : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Prices"
        description="Manage product pricing and Stripe price tiers"
      />

      <Suspense fallback={<div>Loading...</div>}>
        <PricesClient
          initialData={prices}
          products={products}
          initialFilters={filters}
          initialSort={{ column: sortColumn, direction: sortDirection }}
        />
      </Suspense>
    </div>
  );
}
