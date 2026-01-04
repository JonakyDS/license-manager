import "dotenv/config";
import { db } from "./drizzle";
import { user, account, product, license, licenseActivation } from "./schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Hash password using scrypt (same as better-auth)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Helper to generate random ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper to generate random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// Helper to pick random item from array
function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate license key
function generateLicenseKey(): string {
  const segments = [];
  for (let i = 0; i < 4; i++) {
    segments.push(Math.random().toString(36).substring(2, 6).toUpperCase());
  }
  return segments.join("-");
}

// Data pools for realistic names
const firstNames = [
  "James",
  "Mary",
  "John",
  "Patricia",
  "Robert",
  "Jennifer",
  "Michael",
  "Linda",
  "William",
  "Elizabeth",
  "David",
  "Barbara",
  "Richard",
  "Susan",
  "Joseph",
  "Jessica",
  "Thomas",
  "Sarah",
  "Charles",
  "Karen",
  "Christopher",
  "Lisa",
  "Daniel",
  "Nancy",
  "Matthew",
  "Betty",
  "Anthony",
  "Margaret",
  "Mark",
  "Sandra",
  "Donald",
  "Ashley",
  "Steven",
  "Kimberly",
  "Paul",
  "Emily",
  "Andrew",
  "Donna",
  "Joshua",
  "Michelle",
  "Kenneth",
  "Dorothy",
  "Kevin",
  "Carol",
  "Brian",
  "Amanda",
  "George",
  "Melissa",
  "Timothy",
  "Deborah",
  "Ronald",
  "Stephanie",
  "Edward",
  "Rebecca",
  "Jason",
  "Sharon",
  "Jeffrey",
  "Laura",
  "Ryan",
  "Cynthia",
  "Jacob",
  "Kathleen",
  "Gary",
  "Amy",
  "Nicholas",
  "Angela",
  "Eric",
  "Shirley",
  "Jonathan",
  "Anna",
  "Stephen",
  "Brenda",
  "Larry",
  "Pamela",
  "Justin",
  "Emma",
  "Scott",
  "Nicole",
  "Brandon",
  "Helen",
  "Benjamin",
  "Samantha",
  "Samuel",
  "Katherine",
  "Raymond",
  "Christine",
  "Gregory",
  "Debra",
  "Frank",
  "Rachel",
  "Alexander",
  "Carolyn",
  "Patrick",
  "Janet",
  "Jack",
  "Catherine",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
  "Walker",
  "Young",
  "Allen",
  "King",
  "Wright",
  "Scott",
  "Torres",
  "Nguyen",
  "Hill",
  "Flores",
  "Green",
  "Adams",
  "Nelson",
  "Baker",
  "Hall",
  "Rivera",
  "Campbell",
  "Mitchell",
  "Carter",
  "Roberts",
  "Gomez",
  "Phillips",
  "Evans",
  "Turner",
  "Diaz",
  "Parker",
  "Cruz",
  "Edwards",
  "Collins",
  "Reyes",
  "Stewart",
  "Morris",
  "Morales",
  "Murphy",
  "Cook",
  "Rogers",
  "Gutierrez",
  "Ortiz",
  "Morgan",
  "Cooper",
  "Peterson",
  "Bailey",
  "Reed",
  "Kelly",
  "Howard",
  "Ramos",
  "Kim",
  "Cox",
  "Ward",
  "Richardson",
  "Watson",
  "Brooks",
  "Chavez",
  "Wood",
  "James",
  "Bennett",
  "Gray",
  "Mendoza",
  "Ruiz",
  "Hughes",
  "Price",
  "Alvarez",
  "Castillo",
  "Sanders",
  "Patel",
  "Myers",
];

const emailDomains = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "aol.com",
  "zoho.com",
  "fastmail.com",
  "company.com",
  "business.org",
  "enterprise.io",
  "startup.co",
  "agency.net",
];

const productData = [
  // Plugins
  {
    name: "Advanced Form Builder",
    slug: "advanced-form-builder",
    type: "plugin" as const,
    description:
      "Create complex forms with drag-and-drop interface, conditional logic, and advanced validation.",
  },
  {
    name: "SEO Optimizer Pro",
    slug: "seo-optimizer-pro",
    type: "plugin" as const,
    description:
      "Comprehensive SEO toolkit with keyword analysis, sitemap generation, and schema markup.",
  },
  {
    name: "WooCommerce Booster",
    slug: "woocommerce-booster",
    type: "plugin" as const,
    description:
      "Enhance your WooCommerce store with advanced features and performance optimizations.",
  },
  {
    name: "Security Shield",
    slug: "security-shield",
    type: "plugin" as const,
    description:
      "Enterprise-grade security plugin with firewall, malware scanning, and brute force protection.",
  },
  {
    name: "Speed Optimizer",
    slug: "speed-optimizer",
    type: "plugin" as const,
    description:
      "Boost your site speed with caching, minification, and lazy loading features.",
  },
  {
    name: "Backup Master",
    slug: "backup-master",
    type: "plugin" as const,
    description:
      "Automated backups with cloud storage integration and one-click restore.",
  },
  {
    name: "Analytics Dashboard",
    slug: "analytics-dashboard",
    type: "plugin" as const,
    description:
      "Beautiful analytics dashboard with custom reports and real-time data.",
  },
  {
    name: "Email Marketing Suite",
    slug: "email-marketing-suite",
    type: "plugin" as const,
    description:
      "Complete email marketing solution with automation, segmentation, and A/B testing.",
  },
  {
    name: "Social Media Connect",
    slug: "social-media-connect",
    type: "plugin" as const,
    description:
      "Integrate and manage all your social media accounts from one place.",
  },
  {
    name: "Membership Pro",
    slug: "membership-pro",
    type: "plugin" as const,
    description:
      "Create membership sites with content protection, subscription plans, and member management.",
  },

  // Themes
  {
    name: "Corporate Elite",
    slug: "corporate-elite",
    type: "theme" as const,
    description:
      "Professional business theme with modern design and powerful customization options.",
  },
  {
    name: "Creative Portfolio",
    slug: "creative-portfolio",
    type: "theme" as const,
    description:
      "Stunning portfolio theme for designers, photographers, and creative professionals.",
  },
  {
    name: "Blog Master",
    slug: "blog-master",
    type: "theme" as const,
    description:
      "Clean and fast blog theme with multiple layouts and typography options.",
  },
  {
    name: "E-commerce starter",
    slug: "ecommerce-starter",
    type: "theme" as const,
    description: "Feature-rich theme designed specifically for online stores.",
  },
  {
    name: "Magazine Press",
    slug: "magazine-press",
    type: "theme" as const,
    description:
      "News and magazine theme with multiple article layouts and ad management.",
  },
  {
    name: "App Landing",
    slug: "app-landing",
    type: "theme" as const,
    description:
      "High-converting landing page theme for apps and SaaS products.",
  },
  {
    name: "Restaurant Theme",
    slug: "restaurant-theme",
    type: "theme" as const,
    description:
      "Beautiful theme for restaurants with menu management and reservation system.",
  },
  {
    name: "Real Estate Pro",
    slug: "real-estate-pro",
    type: "theme" as const,
    description:
      "Complete real estate theme with property listings and agent profiles.",
  },

  // Source Code
  {
    name: "React Dashboard Kit",
    slug: "react-dashboard-kit",
    type: "source_code" as const,
    description:
      "Production-ready React admin dashboard with authentication and data visualization.",
  },
  {
    name: "Node.js API Starter",
    slug: "nodejs-api-starter",
    type: "source_code" as const,
    description:
      "Scalable Node.js API boilerplate with TypeScript, authentication, and database setup.",
  },
  {
    name: "Flutter E-commerce App",
    slug: "flutter-ecommerce-app",
    type: "source_code" as const,
    description:
      "Complete Flutter app for iOS and Android with cart, payments, and order tracking.",
  },
  {
    name: "Laravel SaaS Kit",
    slug: "laravel-saas-kit",
    type: "source_code" as const,
    description:
      "Multi-tenant SaaS starter kit with billing, teams, and API access.",
  },
  {
    name: "Next.js Blog Starter",
    slug: "nextjs-blog-starter",
    type: "source_code" as const,
    description:
      "SEO-optimized blog built with Next.js, MDX, and Tailwind CSS.",
  },
  {
    name: "Vue Admin Panel",
    slug: "vue-admin-panel",
    type: "source_code" as const,
    description:
      "Beautiful Vue.js admin panel with charts, tables, and form components.",
  },

  // Other
  {
    name: "Icon Pack Premium",
    slug: "icon-pack-premium",
    type: "other" as const,
    description:
      "5000+ premium icons in multiple formats with lifetime updates.",
  },
  {
    name: "UI Kit Ultimate",
    slug: "ui-kit-ultimate",
    type: "other" as const,
    description:
      "Comprehensive UI kit with 500+ components for Figma and Sketch.",
  },
  {
    name: "Stock Photo Bundle",
    slug: "stock-photo-bundle",
    type: "other" as const,
    description: "10,000 high-resolution stock photos for commercial use.",
  },
  {
    name: "Video Templates Pro",
    slug: "video-templates-pro",
    type: "other" as const,
    description:
      "Professional video templates for After Effects and Premiere Pro.",
  },
];

const domains = [
  "example.com",
  "mysite.org",
  "business.net",
  "store.io",
  "blog.co",
  "agency.dev",
  "startup.app",
  "portfolio.me",
  "shop.store",
  "news.press",
  "tech.solutions",
  "digital.agency",
  "creative.studio",
  "web.services",
  "cloud.host",
  "market.place",
  "social.network",
  "media.group",
  "design.works",
  "code.labs",
];

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Date range: 3 years ago to now
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const now = new Date();

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await db.delete(licenseActivation);
  await db.delete(license);
  await db.delete(product);
  await db.delete(account);
  await db.delete(user);
  console.log("✅ Cleared existing data\n");

  // Create admin user
  console.log("👤 Creating admin user...");
  const adminId = generateId();
  const hashedPassword = await hashPassword("admin123");

  await db.insert(user).values({
    id: adminId,
    name: "Admin User",
    email: "admin@example.com",
    emailVerified: true,
    role: "admin",
    createdAt: threeYearsAgo,
    updatedAt: threeYearsAgo,
  });

  await db.insert(account).values({
    id: generateId(),
    accountId: adminId,
    providerId: "credential",
    userId: adminId,
    password: hashedPassword,
    createdAt: threeYearsAgo,
    updatedAt: threeYearsAgo,
  });
  console.log("✅ Admin user created (admin@example.com / admin123)\n");

  // Create regular users (150 users spread over 3 years)
  console.log("👥 Creating users...");
  const userCount = 150;
  const users: { id: string; createdAt: Date }[] = [];

  for (let i = 0; i < userCount; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const userId = generateId();
    const createdAt = randomDate(threeYearsAgo, now);
    const emailVerified = Math.random() > 0.15; // 85% verified
    const isAdmin = Math.random() > 0.95; // 5% admins

    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@${randomItem(emailDomains)}`;

    await db.insert(user).values({
      id: userId,
      name: `${firstName} ${lastName}`,
      email,
      emailVerified,
      role: isAdmin ? "admin" : "user",
      createdAt,
      updatedAt: createdAt,
    });

    // Create credential account for some users
    if (Math.random() > 0.3) {
      await db.insert(account).values({
        id: generateId(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hashedPassword,
        createdAt,
        updatedAt: createdAt,
      });
    }

    users.push({ id: userId, createdAt });

    if ((i + 1) % 50 === 0) {
      console.log(`  Created ${i + 1}/${userCount} users...`);
    }
  }
  console.log(`✅ Created ${userCount} users\n`);

  // Create products (spread over 2.5 years)
  console.log("📦 Creating products...");
  const twoAndHalfYearsAgo = new Date();
  twoAndHalfYearsAgo.setFullYear(twoAndHalfYearsAgo.getFullYear() - 2);
  twoAndHalfYearsAgo.setMonth(twoAndHalfYearsAgo.getMonth() - 6);

  const products: { id: string; createdAt: Date }[] = [];

  for (const p of productData) {
    const productId = generateId();
    const createdAt = randomDate(
      twoAndHalfYearsAgo,
      new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    ); // At least 30 days ago
    const active = Math.random() > 0.1; // 90% active

    await db.insert(product).values({
      id: productId,
      name: p.name,
      slug: p.slug,
      description: p.description,
      type: p.type,
      active,
      createdAt,
      updatedAt: createdAt,
    });

    products.push({ id: productId, createdAt });
  }
  console.log(`✅ Created ${productData.length} products\n`);

  // Create licenses (500 licenses spread over time)
  console.log("🔑 Creating licenses...");
  const licenseCount = 500;
  const licenses: {
    id: string;
    productId: string;
    createdAt: Date;
    status: "active" | "expired" | "revoked";
  }[] = [];

  for (let i = 0; i < licenseCount; i++) {
    const licenseId = generateId();
    const productInfo = randomItem(products);

    // License created after product
    const minDate = new Date(
      Math.max(productInfo.createdAt.getTime(), threeYearsAgo.getTime())
    );
    const createdAt = randomDate(minDate, now);

    // Determine status based on age
    const ageInDays =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    let status: "active" | "expired" | "revoked";

    if (Math.random() > 0.95) {
      status = "revoked"; // 5% revoked
    } else if (ageInDays > 365 && Math.random() > 0.3) {
      status = "expired"; // Older licenses more likely expired
    } else if (ageInDays > 180 && Math.random() > 0.6) {
      status = "expired";
    } else {
      status = "active";
    }

    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const validityDays = randomItem([30, 90, 180, 365, 365, 365, 730]); // Weight towards 1 year

    const activatedAt =
      Math.random() > 0.1
        ? randomDate(
            createdAt,
            new Date(
              Math.min(
                createdAt.getTime() + 7 * 24 * 60 * 60 * 1000,
                now.getTime()
              )
            )
          )
        : null;

    const expiresAt = activatedAt
      ? new Date(activatedAt.getTime() + validityDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(license).values({
      id: licenseId,
      productId: productInfo.id,
      licenseKey: generateLicenseKey(),
      customerName: `${firstName} ${lastName}`,
      customerEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomItem(emailDomains)}`,
      status,
      validityDays,
      activatedAt,
      expiresAt,
      maxDomainChanges: randomItem([1, 2, 3, 3, 3, 5]),
      domainChangesUsed: Math.floor(Math.random() * 3),
      notes:
        Math.random() > 0.7
          ? `Order #${Math.floor(Math.random() * 100000)}`
          : null,
      createdAt,
      updatedAt: createdAt,
    });

    licenses.push({
      id: licenseId,
      productId: productInfo.id,
      createdAt,
      status,
    });

    if ((i + 1) % 100 === 0) {
      console.log(`  Created ${i + 1}/${licenseCount} licenses...`);
    }
  }
  console.log(`✅ Created ${licenseCount} licenses\n`);

  // Create license activations (for active and some expired licenses)
  console.log("🌐 Creating license activations...");
  let activationCount = 0;

  for (const lic of licenses) {
    if (lic.status === "revoked") continue;
    if (Math.random() > 0.8) continue; // Skip 20% without activations

    const numActivations =
      Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 1;

    for (let j = 0; j < numActivations; j++) {
      const activatedAt = randomDate(
        lic.createdAt,
        new Date(
          Math.min(
            lic.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000,
            now.getTime()
          )
        )
      );

      const isActive = j === numActivations - 1 && lic.status === "active"; // Only latest is active
      const deactivatedAt = !isActive ? randomDate(activatedAt, now) : null;

      await db.insert(licenseActivation).values({
        id: generateId(),
        licenseId: lic.id,
        domain: `${randomItem(["www", "app", "shop", "blog", "portal"])}.${randomItem(domains)}`,
        ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        isActive,
        activatedAt,
        deactivatedAt,
        deactivationReason: deactivatedAt
          ? randomItem([
              "Domain changed",
              "License transferred",
              "Refund requested",
              null,
            ])
          : null,
        createdAt: activatedAt,
        updatedAt: deactivatedAt || activatedAt,
      });

      activationCount++;
    }
  }
  console.log(`✅ Created ${activationCount} license activations\n`);

  // Summary
  console.log("📊 Seed Summary:");
  console.log(`   - Users: ${userCount + 1} (including admin)`);
  console.log(`   - Products: ${productData.length}`);
  console.log(`   - Licenses: ${licenseCount}`);
  console.log(`   - Activations: ${activationCount}`);
  console.log("\n✨ Database seeded successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
