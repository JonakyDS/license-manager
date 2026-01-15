/**
 * Server Actions Index
 *
 * Re-exports all server actions for convenient imports.
 *
 * @example
 * ```ts
 * import { getUsers, createUser, requireAdmin } from "@/lib/actions";
 * ```
 */

// Auth
export { getCurrentUser, requireAdmin, requireAuth } from "./auth";

// Auth Types (from types file)
export {
  isAdminCheckSuccess,
  type AuthenticatedUser,
  type AdminCheckResult,
  type AdminCheckFailure,
  type AdminCheckResponse,
} from "@/lib/types/auth";

// Users
export {
  getUsers,
  getUserById,
  getUserStats,
  createUser,
  updateUser,
  deleteUser,
  deleteUsers,
} from "./users";

// Products
export {
  getProducts,
  getAllProducts,
  getProductById,
  getProductStats,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProducts,
} from "./products";

// Licenses
export {
  getLicenses,
  getLicenseById,
  getLicenseStats,
  createLicense,
  updateLicense,
  revokeLicense,
  deleteLicense,
  deleteLicenses,
} from "./licenses";

// CSV Uploads
export {
  getCsvUploads,
  getCsvUploadById,
  getCsvUploadStats,
  updateCsvUploadStatus,
  deleteCsvUpload,
  deleteCsvUploads,
} from "./csv-uploads";

// Prices
export {
  getPrices,
  getPriceById,
  createPrice,
  updatePrice,
  deletePrice,
  bulkDeletePrices,
  getProductPrices,
} from "./prices";

// Subscriptions
export {
  getSubscriptions,
  getSubscriptionById,
  adminCancelSubscription,
  adminResumeSubscription,
  bulkDeleteSubscriptions,
  getMySubscriptions,
  cancelMySubscription,
  resumeMySubscription,
  hasActiveSubscription,
  getActiveSubscription,
} from "./subscriptions";

// Utilities (for internal use or testing)
export {
  success,
  ok,
  failure,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  withErrorHandling,
  calculatePagination,
  calculateOffset,
  generateLicenseKey,
  generateId,
} from "./utils";
