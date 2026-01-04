# Nalda API Documentation

This document describes the API endpoints for Nalda CSV upload and SFTP validation.

## Base URL

```
https://license-manager-jonakyds.vercel.app
```

All API endpoints are relative to this base URL.

## Overview

The Nalda API provides:
1. **CSV Upload** - Upload CSV files directly to the API (files are stored on UploadThing)
2. **SFTP Validation** - Validate SFTP credentials before creating upload requests

**Note: CSV files are uploaded via `multipart/form-data`. The API receives the file, validates the license, and then stores it on UploadThing.**

## Setup

### Environment Variables

Add the following environment variable to your `.env.local` file:

```env
UPLOADTHING_TOKEN=your_uploadthing_token_here
```

Get your token from [UploadThing Dashboard](https://uploadthing.com/dashboard).

## Endpoints

### 1. Upload CSV and Create Request

Uploads a CSV file along with SFTP credentials. The API validates the license, uploads the file to storage, and creates a processing request.

**Endpoint:** `POST /api/v2/nalda/csv-upload`

**Content-Type:** `multipart/form-data`

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `license_key` | string | Yes | Valid license key (format: XXXX-XXXX-XXXX-XXXX) |
| `domain` | string | Yes | Domain activated for the license |
| `sftp_host` | string | Yes | SFTP server hostname (must be subdomain of nalda.com) |
| `sftp_port` | string | No | SFTP port (default: 22) |
| `sftp_username` | string | Yes | SFTP username |
| `sftp_password` | string | Yes | SFTP password |
| `csv_file` | File | Yes | The CSV file to upload (max 16MB) |

**Example Request (cURL):**

```bash
curl -X POST "https://license-manager-jonakyds.vercel.app/api/v2/nalda/csv-upload" \
  -F "license_key=ABCD-1234-EFGH-5678" \
  -F "domain=mysite.com" \
  -F "sftp_host=sftp.nalda.com" \
  -F "sftp_port=22" \
  -F "sftp_username=uploader" \
  -F "sftp_password=secret" \
  -F "csv_file=@/path/to/data.csv"
```

**Example Request (PHP/WordPress):**

```php
<?php
function upload_csv_to_nalda($license_key, $domain, $sftp_credentials, $csv_file_path) {
    $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda/csv-upload';
    
    // Prepare the file for upload
    $csv_file = new CURLFile($csv_file_path, 'text/csv', basename($csv_file_path));
    
    $post_data = array(
        'license_key'   => $license_key,
        'domain'        => $domain,
        'sftp_host'     => $sftp_credentials['host'],
        'sftp_port'     => $sftp_credentials['port'] ?? 22,
        'sftp_username' => $sftp_credentials['username'],
        'sftp_password' => $sftp_credentials['password'],
        'csv_file'      => $csv_file,
    );
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $api_url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $post_data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Accept: application/json',
    ));
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return array(
        'status_code' => $http_code,
        'body' => json_decode($response, true),
    );
}

// Usage example
$result = upload_csv_to_nalda(
    'ABCD-1234-EFGH-5678',
    'mysite.com',
    array(
        'host' => 'sftp.nalda.com',
        'port' => 22,
        'username' => 'uploader',
        'password' => 'secret',
    ),
    '/tmp/data.csv'
);

if ($result['body']['success']) {
    echo "Upload successful! Request ID: " . $result['body']['data']['id'];
} else {
    echo "Upload failed: " . $result['body']['error']['message'];
}
```

**Example Request (JavaScript/TypeScript):**

```typescript
async function uploadCsvToNalda(
  licenseKey: string,
  domain: string,
  sftpCredentials: {
    host: string;
    port?: number;
    username: string;
    password: string;
  },
  csvFile: File
): Promise<{ success: boolean; data?: any; error?: any }> {
  const formData = new FormData();
  formData.append('license_key', licenseKey);
  formData.append('domain', domain);
  formData.append('sftp_host', sftpCredentials.host);
  formData.append('sftp_port', String(sftpCredentials.port ?? 22));
  formData.append('sftp_username', sftpCredentials.username);
  formData.append('sftp_password', sftpCredentials.password);
  formData.append('csv_file', csvFile);

  const response = await fetch(
    'https://license-manager-jonakyds.vercel.app/api/v2/nalda/csv-upload',
    {
      method: 'POST',
      body: formData,
    }
  );

  return response.json();
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "unique_request_id",
    "license_id": "license_uuid",
    "domain": "example.com",
    "csv_file_key": "file_key_from_storage",
    "csv_file_url": "https://storage.example.com/file.csv",
    "csv_file_name": "data.csv",
    "csv_file_size": 1024567,
    "status": "pending",
    "created_at": "2026-01-04T12:00:00.000Z"
  },
  "message": "CSV upload request created successfully"
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters or file |
| 403 | LICENSE_REVOKED | License has been revoked |
| 403 | LICENSE_EXPIRED | License has expired |
| 403 | DOMAIN_MISMATCH | Domain not activated for this license |
| 404 | LICENSE_NOT_FOUND | Invalid license key |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |

### 2. List CSV Upload Requests

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
        "csv_file_url": "https://storage.example.com/file1.csv",
        "csv_file_name": "data1.csv",
        "csv_file_size": 1024567,
        "status": "processed",
        "processed_at": "2026-01-04T14:00:00.000Z",
        "error_message": null,
        "created_at": "2026-01-04T12:00:00.000Z"
      },
      {
        "id": "request_id_2",
        "domain": "example.com",
        "csv_file_key": "file_key_2",
        "csv_file_url": "https://storage.example.com/file2.csv",
        "csv_file_name": "data2.csv",
        "csv_file_size": 2048000,
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

### 3. Validate SFTP Credentials

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

**Example Usage (PHP/WordPress):**

```php
<?php
function validate_sftp_credentials($license_key, $domain, $sftp_config) {
    $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda/sftp-validate';
    
    $response = wp_remote_post($api_url, array(
        'headers' => array('Content-Type' => 'application/json'),
        'body' => json_encode(array(
            'license_key' => $license_key,
            'domain' => $domain,
            'hostname' => $sftp_config['hostname'],
            'port' => $sftp_config['port'] ?? 22,
            'username' => $sftp_config['username'],
            'password' => $sftp_config['password'],
        )),
        'timeout' => 30,
    ));
    
    if (is_wp_error($response)) {
        return array('success' => false, 'error' => $response->get_error_message());
    }
    
    return json_decode(wp_remote_retrieve_body($response), true);
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

### File Validation

- Maximum file size: 16MB
- Allowed file type: CSV (text/csv)
- Files are stored securely on UploadThing

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
│     Plugin → API: license_key + domain + SFTP credentials                │
│     API validates license, then tests SFTP connection                    │
│     API → Plugin: success/failure with error details                     │
│                                                                          │
│  2. UPLOAD CSV FILE                                                      │
│     Plugin → API: license_key + domain + SFTP creds + CSV file           │
│     API validates license, uploads file to storage                       │
│     API stores request in database                                       │
│     API → Plugin: request ID + file details                              │
│                                                                          │
│  3. CHECK STATUS (optional)                                              │
│     Plugin → API: license_key + domain                                   │
│     API → Plugin: list of requests with status                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Complete WordPress Plugin Example

```php
<?php
/**
 * Nalda CSV Upload Integration for WordPress
 */

class Nalda_CSV_Uploader {
    private $api_base = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda';
    private $license_key;
    private $domain;
    
    public function __construct($license_key) {
        $this->license_key = $license_key;
        $this->domain = parse_url(home_url(), PHP_URL_HOST);
    }
    
    /**
     * Validate SFTP credentials before uploading
     */
    public function validate_sftp($hostname, $port, $username, $password) {
        $response = wp_remote_post($this->api_base . '/sftp-validate', array(
            'headers' => array('Content-Type' => 'application/json'),
            'body' => json_encode(array(
                'license_key' => $this->license_key,
                'domain' => $this->domain,
                'hostname' => $hostname,
                'port' => (int) $port,
                'username' => $username,
                'password' => $password,
            )),
            'timeout' => 30,
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'error' => array('message' => $response->get_error_message())
            );
        }
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
    
    /**
     * Upload CSV file with SFTP credentials
     */
    public function upload_csv($csv_file_path, $sftp_host, $sftp_username, $sftp_password, $sftp_port = 22) {
        // Check if file exists
        if (!file_exists($csv_file_path)) {
            return array(
                'success' => false,
                'error' => array('message' => 'CSV file not found')
            );
        }
        
        // Prepare multipart request
        $boundary = wp_generate_uuid4();
        $body = '';
        
        // Add form fields
        $fields = array(
            'license_key' => $this->license_key,
            'domain' => $this->domain,
            'sftp_host' => $sftp_host,
            'sftp_port' => (string) $sftp_port,
            'sftp_username' => $sftp_username,
            'sftp_password' => $sftp_password,
        );
        
        foreach ($fields as $name => $value) {
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
            $body .= "{$value}\r\n";
        }
        
        // Add file
        $file_content = file_get_contents($csv_file_path);
        $file_name = basename($csv_file_path);
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"csv_file\"; filename=\"{$file_name}\"\r\n";
        $body .= "Content-Type: text/csv\r\n\r\n";
        $body .= "{$file_content}\r\n";
        $body .= "--{$boundary}--\r\n";
        
        $response = wp_remote_post($this->api_base . '/csv-upload', array(
            'headers' => array(
                'Content-Type' => "multipart/form-data; boundary={$boundary}",
            ),
            'body' => $body,
            'timeout' => 60,
        ));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'error' => array('message' => $response->get_error_message())
            );
        }
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
    
    /**
     * List upload requests
     */
    public function list_requests($page = 1, $limit = 10, $status = null) {
        $url = add_query_arg(array(
            'license_key' => $this->license_key,
            'domain' => $this->domain,
            'page' => $page,
            'limit' => $limit,
            'status' => $status,
        ), $this->api_base . '/csv-upload/list');
        
        $response = wp_remote_get($url, array('timeout' => 30));
        
        if (is_wp_error($response)) {
            return array(
                'success' => false,
                'error' => array('message' => $response->get_error_message())
            );
        }
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
}

// Usage example
$uploader = new Nalda_CSV_Uploader('ABCD-1234-EFGH-5678');

// Step 1: Validate SFTP credentials
$sftp_result = $uploader->validate_sftp('sftp.nalda.com', 22, 'user', 'password');
if (!$sftp_result['success']) {
    error_log('SFTP validation failed: ' . $sftp_result['error']['message']);
    return;
}

// Step 2: Upload CSV file
$upload_result = $uploader->upload_csv(
    '/tmp/data.csv',
    'sftp.nalda.com',
    'user',
    'password',
    22
);

if ($upload_result['success']) {
    echo 'Upload successful! Request ID: ' . $upload_result['data']['id'];
    echo 'File URL: ' . $upload_result['data']['csv_file_url'];
} else {
    echo 'Upload failed: ' . $upload_result['error']['message'];
}

// Step 3: Check status
$list_result = $uploader->list_requests(1, 10);
foreach ($list_result['data']['requests'] as $request) {
    echo sprintf(
        "Request %s: %s (%s)\n",
        $request['id'],
        $request['csv_file_name'],
        $request['status']
    );
}
```
