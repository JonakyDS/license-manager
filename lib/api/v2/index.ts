/**
 * License API Exports
 *
 * Central export point for all license API utilities.
 */

// Types
export type {
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ErrorCode,
  ActivateRequest,
  ValidateRequest,
  DeactivateRequest,
  StatusRequest,
  ActivateResponseData,
  ValidateResponseData,
  DeactivateResponseData,
  StatusResponseData,
} from "./types";

// Validation Schemas
export {
  activateRequestSchema,
  validateRequestSchema,
  deactivateRequestSchema,
  statusRequestSchema,
} from "./validation";

export type {
  ActivateRequestValidated,
  ValidateRequestValidated,
  DeactivateRequestValidated,
  StatusRequestValidated,
} from "./validation";

// Utilities
export {
  maskEmail,
  successResponse,
  errorResponse,
  validationErrorResponse,
  parseRequestBody,
  calculateDaysRemaining,
  isLicenseExpired,
  getActiveActivation,
  findLicenseByKey,
  findLicenseByKeyAndProduct,
  markLicenseAsExpired,
  validateLicensePrerequisites,
  generateId,
  logApiRequest,
  logApiError,
} from "./utils";
