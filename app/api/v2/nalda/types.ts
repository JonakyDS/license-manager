/**
 * Shared types for Nalda API endpoints
 */

import type { ErrorCode } from "@/lib/api/v2/types";

// ============================================================================
// SFTP Types
// ============================================================================

export interface SftpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface SftpUploadResult {
  success: true;
  remotePath: string;
}

export interface SftpUploadError {
  success: false;
  error: Error;
}

export type SftpUploadOutcome = SftpUploadResult | SftpUploadError;

export interface SftpValidationResult {
  success: true;
  hostname: string;
  port: number;
  username: string;
  connected: boolean;
  currentDirectory: string;
}

export interface SftpValidationError {
  success: false;
  error: Error;
}

export type SftpValidationOutcome = SftpValidationResult | SftpValidationError;

// ============================================================================
// Storage Types
// ============================================================================

export interface StorageUploadResult {
  success: true;
  key: string;
  url: string;
}

export interface StorageUploadError {
  success: false;
  error: string;
}

export type StorageUploadOutcome = StorageUploadResult | StorageUploadError;

// ============================================================================
// Error Mapping Types
// ============================================================================

export interface MappedError {
  code: ErrorCode;
  message: string;
  status: number;
}
