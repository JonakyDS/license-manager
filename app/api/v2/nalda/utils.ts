/**
 * Shared utilities for Nalda API endpoints
 */

import type { MappedError } from "./types";

/**
 * Maps SFTP errors to user-friendly error responses.
 * Provides consistent error handling across all Nalda endpoints.
 *
 * @param error - The SFTP error to map
 * @returns Mapped error with code, message, and HTTP status
 */
export function mapSftpError(error: Error): MappedError {
  const errorMessage = error.message.toLowerCase();

  // Authentication errors
  if (
    errorMessage.includes("authentication failed") ||
    errorMessage.includes("all configured authentication methods failed")
  ) {
    return {
      code: "AUTH_FAILED",
      message:
        "SFTP authentication failed. Please check username and password.",
      status: 401,
    };
  }

  // DNS/hostname errors
  if (
    errorMessage.includes("enotfound") ||
    errorMessage.includes("getaddrinfo")
  ) {
    return {
      code: "HOST_NOT_FOUND",
      message:
        "SFTP hostname could not be resolved. Please check the hostname.",
      status: 400,
    };
  }

  // Connection refused
  if (
    errorMessage.includes("econnrefused") ||
    errorMessage.includes("connection refused")
  ) {
    return {
      code: "CONNECTION_REFUSED",
      message: "SFTP connection refused. Please check the hostname and port.",
      status: 400,
    };
  }

  // Timeout errors
  if (
    errorMessage.includes("etimedout") ||
    errorMessage.includes("timed out") ||
    errorMessage.includes("timeout")
  ) {
    return {
      code: "CONNECTION_TIMEOUT",
      message: "SFTP connection timed out. The server may be unreachable.",
      status: 408,
    };
  }

  // Host unreachable
  if (errorMessage.includes("ehostunreach")) {
    return {
      code: "HOST_UNREACHABLE",
      message:
        "SFTP host is unreachable. Please check your network connection.",
      status: 400,
    };
  }

  // Network unreachable
  if (errorMessage.includes("enetunreach")) {
    return {
      code: "NETWORK_UNREACHABLE",
      message: "Network is unreachable. Please check your network connection.",
      status: 400,
    };
  }

  // Connection reset
  if (errorMessage.includes("econnreset")) {
    return {
      code: "CONNECTION_RESET",
      message: "SFTP connection was reset by the server.",
      status: 400,
    };
  }

  // SSH protocol errors
  if (
    errorMessage.includes("handshake failed") ||
    errorMessage.includes("protocol")
  ) {
    return {
      code: "PROTOCOL_ERROR",
      message: "SSH handshake failed. The server may not support SFTP.",
      status: 400,
    };
  }

  // Permission denied (for file operations)
  if (
    errorMessage.includes("permission denied") ||
    errorMessage.includes("access denied")
  ) {
    return {
      code: "FORBIDDEN",
      message: "Permission denied. Cannot write to the SFTP directory.",
      status: 403,
    };
  }

  // Default error
  return {
    code: "CONNECTION_ERROR",
    message: "Failed to connect to SFTP server.",
    status: 400,
  };
}
