/**
 * Validation schemas for admin panel operations
 *
 * Centralized validation schemas using Zod for consistent validation
 * across server actions. Each entity has create/update schemas with
 * shared base validations where applicable.
 */

import { z } from "zod";

// =============================================================================
// SHARED VALIDATORS
// =============================================================================

/** Common string validators */
const validators = {
  id: z.string().min(1, "ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  optionalEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase with hyphens only"
    ),
} as const;

// =============================================================================
// USER SCHEMAS
// =============================================================================

const userRoleEnum = z.enum(["user", "admin"]);

export const userSchema = {
  create: z.object({
    name: validators.name,
    email: validators.email,
    role: userRoleEnum,
  }),

  update: z.object({
    id: validators.id.describe("User ID is required"),
    name: validators.name,
    email: validators.email,
    role: userRoleEnum,
    emailVerified: z.boolean().optional(),
  }),
} as const;

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

const productTypeEnum = z.enum(["plugin", "theme", "source_code", "other"]);

export const productSchema = {
  create: z.object({
    name: validators.name,
    slug: validators.slug,
    description: z.string().optional(),
    type: productTypeEnum,
    active: z.boolean().optional().default(true),
  }),

  update: z.object({
    id: validators.id.describe("Product ID is required"),
    name: validators.name,
    slug: validators.slug,
    description: z.string().optional(),
    type: productTypeEnum,
    active: z.boolean().optional(),
  }),
} as const;

// =============================================================================
// LICENSE SCHEMAS
// =============================================================================

const licenseStatusEnum = z.enum(["active", "expired", "revoked"]);

export const licenseSchema = {
  create: z.object({
    productId: z.string().min(1, "Product is required"),
    customerName: z.string().optional(),
    customerEmail: validators.optionalEmail,
    status: licenseStatusEnum.optional().default("active"),
    validityDays: z.coerce
      .number()
      .min(1, "Validity must be at least 1 day")
      .default(365),
    maxDomainChanges: z.coerce.number().min(0).default(3),
    notes: z.string().optional(),
  }),

  update: z.object({
    id: validators.id.describe("License ID is required"),
    productId: z.string().min(1, "Product is required"),
    customerName: z.string().optional(),
    customerEmail: validators.optionalEmail,
    status: licenseStatusEnum,
    validityDays: z.coerce.number().min(1, "Validity must be at least 1 day"),
    maxDomainChanges: z.coerce.number().min(0),
    notes: z.string().optional(),
  }),
} as const;

// =============================================================================
// CSV UPLOAD SCHEMAS
// =============================================================================

const csvUploadStatusEnum = z.enum([
  "pending",
  "processing",
  "processed",
  "failed",
]);

export const csvUploadSchema = {
  updateStatus: z.object({
    id: validators.id.describe("CSV Upload ID is required"),
    status: csvUploadStatusEnum,
    errorMessage: z.string().optional(),
  }),
} as const;

// =============================================================================
// SUBSCRIPTION & PRICING SCHEMAS
// =============================================================================

const subscriptionStatusEnum = z.enum([
  "active",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "past_due",
  "trialing",
  "unpaid",
  "paused",
]);

const priceTypeEnum = z.enum(["one_time", "recurring"]);
const priceIntervalEnum = z.enum(["day", "week", "month", "year"]);

export const priceSchema = {
  create: z.object({
    productId: z.string().min(1, "Product is required"),
    type: priceTypeEnum,
    currency: z.string().default("usd"),
    unitAmount: z.coerce.number().min(0, "Amount must be positive"),
    interval: priceIntervalEnum.optional(),
    intervalCount: z.coerce.number().min(1).optional().default(1),
    trialPeriodDays: z.coerce.number().min(0).optional(),
    active: z.boolean().optional().default(true),
  }),

  update: z.object({
    id: validators.id.describe("Price ID is required"),
    active: z.boolean(),
  }),
} as const;

export const subscriptionSchema = {
  cancel: z.object({
    id: validators.id.describe("Subscription ID is required"),
    immediate: z.boolean().optional().default(false),
  }),

  resume: z.object({
    id: validators.id.describe("Subscription ID is required"),
  }),
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type UserRole = z.infer<typeof userRoleEnum>;
export type ProductType = z.infer<typeof productTypeEnum>;
export type LicenseStatus = z.infer<typeof licenseStatusEnum>;
export type CsvUploadStatus = z.infer<typeof csvUploadStatusEnum>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusEnum>;
export type PriceType = z.infer<typeof priceTypeEnum>;
export type PriceInterval = z.infer<typeof priceIntervalEnum>;

export type CreateUserInput = z.infer<typeof userSchema.create>;
export type UpdateUserInput = z.infer<typeof userSchema.update>;

export type CreateProductInput = z.infer<typeof productSchema.create>;
export type UpdateProductInput = z.infer<typeof productSchema.update>;

export type CreateLicenseInput = z.infer<typeof licenseSchema.create>;
export type UpdateLicenseInput = z.infer<typeof licenseSchema.update>;

export type UpdateCsvUploadStatusInput = z.infer<
  typeof csvUploadSchema.updateStatus
>;

export type CreatePriceInput = z.infer<typeof priceSchema.create>;
export type UpdatePriceInput = z.infer<typeof priceSchema.update>;

export type CancelSubscriptionInput = z.infer<typeof subscriptionSchema.cancel>;
export type ResumeSubscriptionInput = z.infer<typeof subscriptionSchema.resume>;
