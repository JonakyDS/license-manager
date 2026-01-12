/**
 * License API Validation Schemas
 *
 * Zod schemas for validating API request bodies.
 */

import { z } from "zod";

// ============================================================================
// Custom Validators
// ============================================================================

/**
 * Validates and normalizes a domain string.
 * Accepts domains with or without protocol, strips protocol if present.
 */
export const domainSchema = z
  .string()
  .min(1, "Domain is required")
  .transform((val) => {
    // Remove protocol if present
    let domain = val.toLowerCase().trim();
    domain = domain.replace(/^https?:\/\//, "");
    // Remove trailing slash
    domain = domain.replace(/\/$/, "");
    // Remove path if present
    domain = domain.split("/")[0];
    // Remove port if present for validation, but keep it for storage
    return domain;
  })
  .refine(
    (val) => {
      // Basic domain validation (allows localhost, IP addresses, and domains with ports)
      const domainRegex =
        /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?::\d{1,5})?$/;
      return domainRegex.test(val);
    },
    { message: "Invalid domain format" }
  );

/**
 * Validates a license key format (XXXX-XXXX-XXXX-XXXX).
 */
export const licenseKeySchema = z
  .string()
  .min(1, "License key is required")
  .transform((val) => val.toUpperCase().trim())
  .refine(
    (val) => {
      const keyRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
      return keyRegex.test(val);
    },
    { message: "Invalid license key format. Expected: XXXX-XXXX-XXXX-XXXX" }
  );

/**
 * Validates a product slug.
 */
const productSlugSchema = z
  .string()
  .min(1, "Product slug is required")
  .transform((val) => val.toLowerCase().trim())
  .refine(
    (val) => {
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      return slugRegex.test(val);
    },
    { message: "Invalid product slug format" }
  );

// ============================================================================
// Request Validation Schemas
// ============================================================================

export const activateRequestSchema = z.object({
  license_key: licenseKeySchema,
  product_slug: productSlugSchema,
  domain: domainSchema,
});

export const validateRequestSchema = z.object({
  license_key: licenseKeySchema,
  product_slug: productSlugSchema,
  domain: domainSchema,
});

export const deactivateRequestSchema = z.object({
  license_key: licenseKeySchema,
  product_slug: productSlugSchema,
  domain: domainSchema,
  reason: z
    .string()
    .max(500, "Reason must be less than 500 characters")
    .optional(),
});

export const statusRequestSchema = z.object({
  license_key: licenseKeySchema,
  product_slug: productSlugSchema,
});

// ============================================================================
// Nalda CSV Upload Request Schemas
// ============================================================================

/**
 * CSV type schema for orders and products
 */
export const csvTypeSchema = z.enum(["orders", "products"]);

/**
 * Validates SFTP hostname - must be a subdomain of nalda.com
 */
export const naldaSftpHostSchema = z
  .string()
  .min(1, "SFTP host is required")
  .max(255, "SFTP host must be less than 255 characters")
  .refine(
    (val) => {
      // Only allow subdomains of nalda.com (e.g., sftp.nalda.com, server1.nalda.com)
      const naldaSubdomainRegex =
        /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.nalda\.com$/i;
      return naldaSubdomainRegex.test(val);
    },
    {
      message:
        "SFTP host must be a subdomain of nalda.com (e.g., sftp.nalda.com)",
    }
  );

/**
 * SFTP port validation schema
 */
export const naldaSftpPortSchema = z.coerce
  .number()
  .int("Port must be an integer")
  .min(1, "Port must be at least 1")
  .max(65535, "Port must be at most 65535")
  .default(22);

/**
 * SFTP username validation schema
 */
export const naldaSftpUsernameSchema = z
  .string()
  .min(1, "SFTP username is required")
  .max(255, "SFTP username must be less than 255 characters")
  .refine((val) => !/[\x00-\x1f\x7f]/.test(val), {
    message: "SFTP username contains invalid characters",
  });

/**
 * SFTP password validation schema
 */
export const naldaSftpPasswordSchema = z
  .string()
  .min(1, "SFTP password is required")
  .max(1024, "SFTP password must be less than 1024 characters");

/**
 * Schema for validating Nalda CSV upload form fields (excluding file)
 */
export const naldaCsvUploadFormSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
  csv_type: csvTypeSchema,
  sftp_host: naldaSftpHostSchema,
  sftp_port: naldaSftpPortSchema,
  sftp_username: naldaSftpUsernameSchema,
  sftp_password: naldaSftpPasswordSchema,
});

export const naldaCsvUploadRequestSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
  csv_type: csvTypeSchema,
  sftp_host: naldaSftpHostSchema,
  sftp_port: z.number().int().min(1).max(65535).default(22),
  sftp_username: naldaSftpUsernameSchema,
  sftp_password: naldaSftpPasswordSchema,
  csv_file_key: z
    .string()
    .min(1, "CSV file key is required")
    .max(512, "CSV file key must be less than 512 characters"),
});

export const listNaldaCsvUploadRequestsSchema = z.object({
  license_key: licenseKeySchema,
  domain: domainSchema,
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.enum(["pending", "processing", "processed", "failed"]).optional(),
  csv_type: csvTypeSchema,
});

// ============================================================================
// Type Exports
// ============================================================================

export type ActivateRequestValidated = z.infer<typeof activateRequestSchema>;
export type ValidateRequestValidated = z.infer<typeof validateRequestSchema>;
export type DeactivateRequestValidated = z.infer<
  typeof deactivateRequestSchema
>;
export type StatusRequestValidated = z.infer<typeof statusRequestSchema>;
export type NaldaCsvUploadFormValidated = z.infer<
  typeof naldaCsvUploadFormSchema
>;
export type NaldaCsvUploadRequestValidated = z.infer<
  typeof naldaCsvUploadRequestSchema
>;
export type ListNaldaCsvUploadRequestsValidated = z.infer<
  typeof listNaldaCsvUploadRequestsSchema
>;
export type CsvTypeValidated = z.infer<typeof csvTypeSchema>;
