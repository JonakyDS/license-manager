import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const productTypeEnum = pgEnum("product_type", [
  "plugin",
  "theme",
  "source_code",
  "other",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "active",
  "expired",
  "revoked",
]);

export const csvUploadStatusEnum = pgEnum("csv_upload_status", [
  "pending",
  "processing",
  "processed",
  "failed",
]);

export const csvTypeEnum = pgEnum("csv_type", ["orders", "products"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const product = pgTable(
  "product",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    type: productTypeEnum("type").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("product_slug_idx").on(table.slug)]
);

export const license = pgTable(
  "license",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => product.id, { onDelete: "cascade" }),
    licenseKey: text("license_key").notNull().unique(),
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    status: licenseStatusEnum("status").default("active").notNull(),
    validityDays: integer("validity_days").default(365).notNull(),
    activatedAt: timestamp("activated_at"),
    expiresAt: timestamp("expires_at"),
    maxDomainChanges: integer("max_domain_changes").default(3).notNull(),
    domainChangesUsed: integer("domain_changes_used").default(0).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("license_key_idx").on(table.licenseKey),
    index("license_key_status_idx").on(table.licenseKey, table.status),
    index("license_product_id_idx").on(table.productId),
  ]
);

export const licenseActivation = pgTable(
  "license_activation",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => license.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    ipAddress: text("ip_address"),
    isActive: boolean("is_active").default(true).notNull(),
    activatedAt: timestamp("activated_at"),
    deactivatedAt: timestamp("deactivated_at"),
    deactivationReason: text("deactivation_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("activation_domain_idx").on(table.domain),
    index("activation_license_active_idx").on(table.licenseId, table.isActive),
  ]
);

export const productRelations = relations(product, ({ many }) => ({
  licenses: many(license),
}));

export const licenseRelations = relations(license, ({ one, many }) => ({
  product: one(product, {
    fields: [license.productId],
    references: [product.id],
  }),
  activations: many(licenseActivation),
}));

export const licenseActivationRelations = relations(
  licenseActivation,
  ({ one }) => ({
    license: one(license, {
      fields: [licenseActivation.licenseId],
      references: [license.id],
    }),
  })
);

export const naldaCsvUploadRequest = pgTable(
  "nalda_csv_upload_request",
  {
    id: text("id").primaryKey(),
    licenseId: text("license_id")
      .notNull()
      .references(() => license.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    csvType: csvTypeEnum("csv_type").default("orders").notNull(),
    sftpHost: text("sftp_host").notNull(),
    sftpPort: integer("sftp_port").default(22).notNull(),
    sftpUsername: text("sftp_username").notNull(),
    sftpPassword: text("sftp_password").notNull(),
    csvFileKey: text("csv_file_key").notNull(),
    csvFileUrl: text("csv_file_url").notNull(),
    csvFileName: text("csv_file_name").notNull(),
    csvFileSize: integer("csv_file_size").notNull(),
    status: csvUploadStatusEnum("status").default("pending").notNull(),
    processedAt: timestamp("processed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("csv_upload_license_id_idx").on(table.licenseId),
    index("csv_upload_status_idx").on(table.status),
    index("csv_upload_csv_type_idx").on(table.csvType),
  ]
);

export const naldaCsvUploadRequestRelations = relations(
  naldaCsvUploadRequest,
  ({ one }) => ({
    license: one(license, {
      fields: [naldaCsvUploadRequest.licenseId],
      references: [license.id],
    }),
  })
);
