# Nalda API Documentation

This document describes the API endpoints for Nalda CSV upload and SFTP validation.

## Base URL

```
https://license-manager-jonakyds.vercel.app
```

All API endpoints are relative to this base URL.

## Overview

The Nalda API provides:
1. **CSV Upload** - Upload CSV files using presigned URLs (files never touch our server)
2. **SFTP Validation** - Validate SFTP credentials before creating upload requests

**Important: CSV files are uploaded directly from the client to UploadThing's servers. The file data NEVER passes through our server.**

### How Presigned URLs Work

```
┌─────────┐    1. Request presigned URL    ┌──────────┐
│  Client │ ─────────────────────────────▶ │   Our    │
│         │   (license_key + domain)       │  Server  │
│         │                                │          │
│         │ ◀───────────────────────────── │          │
│         │    2. Presigned URL            │          │
│         │    (after license validation)  └──────────┘
│         │
│         │    3. Upload file directly     ┌──────────┐
│         │ ─────────────────────────────▶ │UploadThing│
│         │    (file goes to S3, not us)   │ Storage  │
│         │                                └──────────┘
│         │ ◀───────────────────────────── 
│         │    4. File key + URL           
└─────────┘
```

## Setup

### Environment Variables

Add the following environment variable to your `.env.local` file:

```env
UPLOADTHING_TOKEN=your_uploadthing_token_here
```

Get your token from [UploadThing Dashboard](https://uploadthing.com/dashboard).

## Endpoints

### 1. Get Presigned URL & Upload CSV (via UploadThing)

The CSV file is uploaded directly to UploadThing using presigned URLs. Our server only validates the license - it never sees the file data.

**How it works:**
1. Client sends `license_key` and `domain` to our UploadThing endpoint
2. Our server validates the license/domain (no file data at this point)
3. If valid, UploadThing returns presigned URLs to the client
4. Client uploads the file **directly** to UploadThing's S3-compatible storage
5. Client receives `fileKey` to use when creating the upload request

**Using the UploadThing React SDK:**

```typescript
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

function UploadComponent() {
  const { startUpload, isUploading } = useUploadThing("naldaCsvUploader", {
    onClientUploadComplete: (res) => {
      // File was uploaded directly to UploadThing, not our server!
      const { fileKey, fileUrl, licenseId, domain } = res[0].serverData;
      console.log("File uploaded to UploadThing:", fileKey);
      
      // Now use fileKey to create the CSV upload request
    },
    onUploadError: (error) => {
      // License validation failed or upload error
      console.error("Upload failed:", error.message);
    },
  });

  const handleUpload = async (files: File[]) => {
    // License validation happens before upload starts
    await startUpload(files, {
      license_key: "XXXX-XXXX-XXXX-XXXX",
      domain: "example.com",
    });
  };

  return (
    <input 
      type="file" 
      accept=".csv"
      onChange={(e) => handleUpload(Array.from(e.target.files || []))}
      disabled={isUploading}
    />
  );
}
```

**Using fetch directly (without React SDK):**

```typescript
// Step 1: Request presigned URLs from our server
const presignedResponse = await fetch("/api/uploadthing", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    files: [{ name: "data.csv", size: file.size, type: "text/csv" }],
    input: {
      license_key: "XXXX-XXXX-XXXX-XXXX",
      domain: "example.com"
    },
    routeConfig: { "text/csv": { maxFileSize: "16MB", maxFileCount: 1 } }
  })
});

// Step 2: Upload directly to UploadThing using presigned URL
// (The presigned URL points to UploadThing's storage, not our server)
```

### 2. Create CSV Upload Request

Creates a new CSV upload request after the file has been uploaded to UploadThing.

**Endpoint:** `POST /api/v2/nalda/csv-upload`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com",
  "sftp_host": "sftp.example.com",
  "sftp_port": 22,
  "sftp_username": "user",
  "sftp_password": "password",
  "csv_file_key": "file_key_from_uploadthing"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `license_key` | string | Yes | Valid license key (format: XXXX-XXXX-XXXX-XXXX) |
| `domain` | string | Yes | Domain activated for the license |
| `sftp_host` | string | Yes | SFTP server hostname |
| `sftp_port` | number | No | SFTP port (default: 22) |
| `sftp_username` | string | Yes | SFTP username |
| `sftp_password` | string | Yes | SFTP password |
| `csv_file_key` | string | Yes | File key from UploadThing upload |

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "unique_request_id",
    "license_id": "license_uuid",
    "domain": "example.com",
    "csv_file_key": "file_key_from_uploadthing",
    "status": "pending",
    "created_at": "2026-01-04T12:00:00.000Z"
  },
  "message": "CSV upload request created successfully"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 403 | LICENSE_REVOKED | License has been revoked |
| 403 | LICENSE_EXPIRED | License has expired |
| 403 | DOMAIN_MISMATCH | Domain not activated for this license |
| 404 | LICENSE_NOT_FOUND | Invalid license key |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### 3. List CSV Upload Requests

Lists CSV upload requests for a specific license and domain.

**Endpoint:** `GET /api/v2/nalda/csv-upload/list`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `license_key` | string | Yes | Valid license key |
| `domain` | string | Yes | Domain to filter requests |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 10, max: 100) |
| `status` | string | No | Filter by status: pending, processing, processed, failed |

**Example Request:**

```
GET /api/v2/nalda/csv-upload/list?license_key=XXXX-XXXX-XXXX-XXXX&domain=example.com&page=1&limit=10
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request_id_1",
        "domain": "example.com",
        "csv_file_key": "file_key_1",
        "status": "processed",
        "processed_at": "2026-01-04T14:00:00.000Z",
        "error_message": null,
        "created_at": "2026-01-04T12:00:00.000Z"
      },
      {
        "id": "request_id_2",
        "domain": "example.com",
        "csv_file_key": "file_key_2",
        "status": "pending",
        "processed_at": null,
        "error_message": null,
        "created_at": "2026-01-04T13:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "total_pages": 1,
      "has_next": false,
      "has_prev": false
    }
  }
}
```

### 4. Validate SFTP Credentials

Validates SFTP credentials by attempting a real connection to the server. Use this endpoint to verify credentials before creating a CSV upload request.

**Endpoint:** `POST /api/v2/nalda/sftp-validate`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "example.com",
  "hostname": "sftp.nalda.com",
  "port": 22,
  "username": "user",
  "password": "password"
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `license_key` | string | Yes | Valid license key (format: XXXX-XXXX-XXXX-XXXX) |
| `domain` | string | Yes | Domain activated for the license |
| `hostname` | string | Yes | SFTP server hostname (must be a subdomain of nalda.com) |
| `port` | number | No | SFTP port (default: 22, range: 1-65535) |
| `username` | string | Yes | SFTP username (max 128 characters) |
| `password` | string | Yes | SFTP password (max 256 characters) |

**Important:** The `hostname` must be a subdomain of `nalda.com` (e.g., `sftp.nalda.com`, `server1.nalda.com`).

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "hostname": "sftp.nalda.com",
    "port": 22,
    "username": "user",
    "connected": true,
    "serverInfo": {
      "currentDirectory": "/home/user"
    }
  },
  "message": "SFTP credentials are valid"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 400 | HOST_NOT_FOUND | Hostname could not be resolved |
| 400 | CONNECTION_REFUSED | Connection refused by server |
| 400 | HOST_UNREACHABLE | Host is unreachable |
| 400 | NETWORK_UNREACHABLE | Network is unreachable |
| 400 | CONNECTION_RESET | Connection was reset by server |
| 400 | PROTOCOL_ERROR | SSH handshake failed |
| 400 | CONNECTION_ERROR | Generic connection failure |
| 401 | AUTH_FAILED | Invalid username or password |
| 403 | LICENSE_REVOKED | License has been revoked |
| 403 | LICENSE_EXPIRED | License has expired |
| 403 | DOMAIN_MISMATCH | Domain not activated for this license |
| 404 | LICENSE_NOT_FOUND | Invalid license key |
| 408 | CONNECTION_TIMEOUT | Connection timed out (10 second limit) |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

**Example Usage:**

```typescript
async function validateSftpCredentials(
  licenseKey: string,
  domain: string,
  sftpConfig: {
    hostname: string;
    port?: number;
    username: string;
    password: string;
  }
): Promise<boolean> {
  const response = await fetch("/api/v2/nalda/sftp-validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      license_key: licenseKey,
      domain: domain,
      hostname: sftpConfig.hostname,
      port: sftpConfig.port ?? 22,
      username: sftpConfig.username,
      password: sftpConfig.password,
    }),
  });

  const result = await response.json();
  
  if (!result.success) {
    // Handle specific error codes
    switch (result.error.code) {
      case "AUTH_FAILED":
        console.error("Invalid SFTP credentials");
        break;
      case "HOST_NOT_FOUND":
        console.error("SFTP server hostname not found");
        break;
      case "CONNECTION_TIMEOUT":
        console.error("Connection timed out");
        break;
      default:
        console.error("SFTP validation failed:", result.error.message);
    }
    return false;
  }

  console.log("SFTP connection successful!");
  console.log("Current directory:", result.data.serverInfo.currentDirectory);
  return true;
}
```

## Security Features

### License Validation

- All requests require a valid license key and domain combination
- The license must be active (not revoked or expired)
- The domain must be activated for the license
- License expiration is checked against the current date

### Rate Limiting

- General rate limit: 60 requests per hour per IP
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### SFTP Credentials

- SFTP credentials are stored in the database
- Consider encrypting sensitive credentials in production
- Credentials are only used during processing, not exposed in list responses

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Request created, awaiting processing |
| `processing` | Currently being processed |
| `processed` | Successfully processed |
| `failed` | Processing failed (check error_message) |

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field_name": ["Validation error message"]
    }
  }
}
```

## Complete Flow Example

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMPLETE UPLOAD FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. VALIDATE SFTP CREDENTIALS (recommended)                              │
│     Client → Our Server: license_key + domain + SFTP credentials         │
│     Our Server validates license, then tests SFTP connection             │
│     Our Server → Client: success/failure with error details              │
│                                                                          │
│  2. REQUEST PRESIGNED URL                                                │
│     Client → Our Server: license_key + domain                            │
│     Our Server validates license (no file data yet)                      │
│     Our Server → Client: presigned URL from UploadThing                  │
│                                                                          │
│  3. DIRECT UPLOAD (file never touches our server!)                       │
│     Client → UploadThing Storage: CSV file via presigned URL             │
│     UploadThing → Client: fileKey, fileUrl                               │
│                                                                          │
│  4. CREATE PROCESSING REQUEST                                            │
│     Client → Our Server: fileKey + SFTP credentials                      │
│     Our Server stores request in database                                │
│                                                                          │
│  5. CHECK STATUS (optional)                                              │
│     Client → Our Server: license_key + domain                            │
│     Our Server → Client: list of requests with status                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Validate SFTP Credentials (Recommended)

Before uploading, validate that the SFTP credentials are correct:

```typescript
const sftpResponse = await fetch("/api/v2/nalda/sftp-validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    license_key: "ABCD-1234-EFGH-5678",
    domain: "mysite.com",
    hostname: "sftp.nalda.com",
    port: 22,
    username: "uploader",
    password: "secret"
  })
});

const sftpResult = await sftpResponse.json();

if (!sftpResult.success) {
  // Handle error - show user-friendly message based on error code
  if (sftpResult.error.code === "AUTH_FAILED") {
    alert("Invalid SFTP username or password");
  } else if (sftpResult.error.code === "HOST_NOT_FOUND") {
    alert("SFTP server not found");
  } else {
    alert(sftpResult.error.message);
  }
  return;
}

// Credentials are valid, proceed to upload
console.log("SFTP credentials validated successfully!");
```

### Step 2 & 3: Upload CSV to UploadThing (Direct Upload)

```typescript
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const { useUploadThing } = generateReactHelpers<OurFileRouter>();

// In your component
const { startUpload } = useUploadThing("naldaCsvUploader");

const handleFileSelect = async (file: File) => {
  const result = await startUpload([file], {
    license_key: "ABCD-1234-EFGH-5678",
    domain: "mysite.com"
  });
  
  // File was uploaded directly to UploadThing
  const fileKey = result[0].serverData.fileKey;
  return fileKey;
};
```

### Step 4: Create CSV Upload Request

```typescript
const fileKey = await handleFileSelect(csvFile);

const response = await fetch("/api/v2/nalda/csv-upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    license_key: "ABCD-1234-EFGH-5678",
    domain: "mysite.com",
    sftp_host: "sftp.nalda.com",
    sftp_port: 22,
    sftp_username: "uploader",
    sftp_password: "secret",
    csv_file_key: fileKey  // From UploadThing
  })
});
```

### Step 5: Check Request Status

```typescript
const statusResponse = await fetch(
  "/api/v2/nalda/csv-upload/list?" + 
  "license_key=ABCD-1234-EFGH-5678&domain=mysite.com"
);
const { data } = await statusResponse.json();
console.log("Requests:", data.requests);
```
