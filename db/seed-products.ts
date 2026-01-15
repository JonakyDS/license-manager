import "dotenv/config";
import { db } from "./drizzle";
import { product, price } from "./schema";

// Helper to generate random ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const productsData = [
  {
    name: "Advanced Form Builder",
    slug: "advanced-form-builder",
    type: "plugin" as const,
    description:
      "Create complex forms with drag-and-drop interface, conditional logic, multi-step forms, and advanced validation. Perfect for contact forms, surveys, and registration flows.",
    features: [
      "Drag-and-drop form builder",
      "50+ field types",
      "Conditional logic",
      "Multi-step forms",
      "Email notifications",
      "Export submissions to CSV",
      "Spam protection",
      "Payment integrations",
    ],
    prices: [
      { amount: 4900, interval: "month" as const, name: "Monthly" },
      { amount: 39900, interval: "year" as const, name: "Annual" },
    ],
  },
  {
    name: "SEO Optimizer Pro",
    slug: "seo-optimizer-pro",
    type: "plugin" as const,
    description:
      "Comprehensive SEO toolkit with keyword analysis, sitemap generation, schema markup, and real-time content optimization. Boost your search rankings effortlessly.",
    features: [
      "Keyword research & tracking",
      "Auto-generate XML sitemaps",
      "Schema markup generator",
      "Content analysis & scoring",
      "Social media previews",
      "Redirect manager",
      "Broken link checker",
      "Competitor analysis",
    ],
    prices: [
      { amount: 2900, interval: "month" as const, name: "Monthly" },
      { amount: 24900, interval: "year" as const, name: "Annual" },
    ],
  },
  {
    name: "WooCommerce Booster",
    slug: "woocommerce-booster",
    type: "plugin" as const,
    description:
      "Supercharge your WooCommerce store with advanced features, performance optimizations, and conversion tools. Increase sales and improve customer experience.",
    features: [
      "Advanced product filters",
      "Quick view modal",
      "Wishlist functionality",
      "Product comparison",
      "Custom checkout fields",
      "Order bumps & upsells",
      "Advanced coupons",
      "Abandoned cart recovery",
    ],
    prices: [
      { amount: 5900, interval: "month" as const, name: "Monthly" },
      { amount: 49900, interval: "year" as const, name: "Annual" },
    ],
  },
  {
    name: "Security Shield",
    slug: "security-shield",
    type: "plugin" as const,
    description:
      "Enterprise-grade security plugin with real-time firewall, malware scanning, brute force protection, and security hardening. Keep your site safe 24/7.",
    features: [
      "Real-time firewall",
      "Malware scanner",
      "Brute force protection",
      "Two-factor authentication",
      "Security audit logs",
      "File change detection",
      "Database security",
      "Email alerts",
    ],
    prices: [
      { amount: 7900, interval: "month" as const, name: "Monthly" },
      { amount: 69900, interval: "year" as const, name: "Annual" },
    ],
  },
  {
    name: "Corporate Elite Theme",
    slug: "corporate-elite",
    type: "theme" as const,
    description:
      "Professional business theme with modern design, powerful customization options, and pre-built templates. Perfect for agencies, consultants, and corporate websites.",
    features: [
      "20+ pre-built templates",
      "Visual page builder",
      "WooCommerce ready",
      "Mega menu support",
      "Portfolio layouts",
      "Blog layouts",
      "Contact form integration",
      "SEO optimized",
    ],
    prices: [
      { amount: 3900, interval: "month" as const, name: "Monthly" },
      { amount: 29900, interval: "year" as const, name: "Annual" },
    ],
  },
  {
    name: "React Dashboard Kit",
    slug: "react-dashboard-kit",
    type: "source_code" as const,
    description:
      "Production-ready React admin dashboard with authentication, charts, tables, and 100+ components. Built with TypeScript and modern best practices.",
    features: [
      "100+ UI components",
      "Authentication system",
      "Dark/light modes",
      "Chart integrations",
      "Data tables",
      "Form builders",
      "TypeScript support",
      "API integration examples",
    ],
    prices: [
      { amount: 9900, interval: "month" as const, name: "Monthly" },
      { amount: 79900, interval: "year" as const, name: "Annual" },
    ],
  },
];

async function seedProducts() {
  console.log("🌱 Seeding products...\n");

  for (const p of productsData) {
    const productId = generateId();

    console.log(`📦 Creating product: ${p.name}`);

    // Insert product
    await db.insert(product).values({
      id: productId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      type: p.type,
      features: JSON.stringify(p.features),
      active: true,
    });

    // Insert prices
    for (const pr of p.prices) {
      const priceId = generateId();

      console.log(
        `  💰 Adding price: ${pr.name} - $${pr.amount / 100}/${pr.interval}`
      );

      await db.insert(price).values({
        id: priceId,
        productId: productId,
        stripePriceId: `price_demo_${productId}_${pr.interval}`, // Demo price ID
        type: "recurring",
        active: true,
        currency: "usd",
        unitAmount: pr.amount,
        interval: pr.interval,
        intervalCount: 1,
      });
    }

    console.log("");
  }

  console.log(
    "✅ Done! Created",
    productsData.length,
    "products with prices.\n"
  );
  console.log("⚠️  Note: The stripe price IDs are demo placeholders.");
  console.log(
    "    To enable real checkout, create products in Stripe Dashboard"
  );
  console.log("    and update the stripe_price_id values.\n");

  process.exit(0);
}

seedProducts().catch((error) => {
  console.error("Error seeding products:", error);
  process.exit(1);
});
