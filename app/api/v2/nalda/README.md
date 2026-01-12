# Nalda API Documentation for WordPress Plugin Developers

This document describes all API endpoints available for integrating CSV upload functionality into your Nalda WordPress plugin.

## Base URL

```
https://license-manager-jonakyds.vercel.app
```

---

## Quick Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/nalda/csv-upload` | POST | Upload CSV file with SFTP credentials |
| `/api/v2/nalda/csv-upload/list` | GET | List previous upload requests |
| `/api/v2/nalda/sftp-validate` | POST | Validate SFTP credentials |

---

## Authentication

All API requests require:
- **`license_key`** - Valid license key in format `XXXX-XXXX-XXXX-XXXX`
- **`domain`** - The WordPress site domain (use `parse_url(home_url(), PHP_URL_HOST)`)

The license must be active, not expired, and activated for the requesting domain.

---

## API Endpoints

### 1. Upload CSV File

Upload a CSV file along with SFTP credentials. The file is uploaded **directly to your SFTP server** and also stored in cloud storage for backup - both uploads happen in parallel for speed.

**CSV Types and Folder Routing:**
- `"orders"` - Uploads to `/order-status` folder on SFTP server
- `"products"` - Uploads to `/products` folder on SFTP server

```
POST /api/v2/nalda/csv-upload
Content-Type: multipart/form-data
```

#### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `license_key` | string | ✅ | License key (XXXX-XXXX-XXXX-XXXX) |
| `domain` | string | ✅ | WordPress site domain |
| `csv_type` | string | ✅ | CSV type: `"orders"` or `"products"` |
| `sftp_host` | string | ✅ | SFTP hostname (must be *.nalda.com) |
| `sftp_port` | string | ❌ | SFTP port (default: 22) |
| `sftp_username` | string | ✅ | SFTP username |
| `sftp_password` | string | ✅ | SFTP password |
| `csv_file` | File | ✅ | CSV file (max 16MB) |

#### PHP Example

```php
<?php
/**
 * Upload CSV file to Nalda API
 *
 * @param string $license_key The license key
 * @param string $csv_file_path Path to the CSV file
 * @param array  $sftp_config SFTP configuration
 * @return array API response
 */
function nalda_upload_csv( $license_key, $csv_file_path, $sftp_config ) {
    $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda/csv-upload';
    $domain  = parse_url( home_url(), PHP_URL_HOST );

    // Validate file exists
    if ( ! file_exists( $csv_file_path ) ) {
        return array(
            'success' => false,
            'error'   => array( 'message' => 'CSV file not found' ),
        );
    }

    // Build multipart form data
    $boundary = wp_generate_uuid4();
    $body     = '';

    // Add text fields
    $fields = array(
        'license_key'   => $license_key,
        'domain'        => $domain,
        'csv_type'      => $sftp_config['csv_type'] ?? 'products', // 'orders' or 'products'
        'sftp_host'     => $sftp_config['host'],
        'sftp_port'     => (string) ( $sftp_config['port'] ?? 22 ),
        'sftp_username' => $sftp_config['username'],
        'sftp_password' => $sftp_config['password'],
    );

    foreach ( $fields as $name => $value ) {
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
        $body .= "{$value}\r\n";
    }

    // Add CSV file
    $file_name    = basename( $csv_file_path );
    $file_content = file_get_contents( $csv_file_path );

    $body .= "--{$boundary}\r\n";
    $body .= "Content-Disposition: form-data; name=\"csv_file\"; filename=\"{$file_name}\"\r\n";
    $body .= "Content-Type: text/csv\r\n\r\n";
    $body .= "{$file_content}\r\n";
    $body .= "--{$boundary}--\r\n";

    // Send request
    $response = wp_remote_post( $api_url, array(
        'headers' => array(
            'Content-Type' => "multipart/form-data; boundary={$boundary}",
        ),
        'body'    => $body,
        'timeout' => 60,
    ) );

    if ( is_wp_error( $response ) ) {
        return array(
            'success' => false,
            'error'   => array( 'message' => $response->get_error_message() ),
        );
    }

    return json_decode( wp_remote_retrieve_body( $response ), true );
}

// Usage
$result = nalda_upload_csv(
    'ABCD-1234-EFGH-5678',
    '/tmp/products.csv',
    array(
        'csv_type' => 'products', // or 'orders'
        'host'     => 'sftp.nalda.com',
        'port'     => 22,
        'username' => 'myuser',
        'password' => 'mypassword',
    )
);

if ( $result['success'] ) {
    $request_id = $result['data']['id'];
    // Save request ID for status checking
} else {
    $error_message = $result['error']['message'];
    // Handle error
}
```

#### Success Response (HTTP 201)

```json
{
  "success": true,
  "data": {
    "id": "abc123xyz",
    "license_id": "license_uuid",
    "domain": "mysite.com",
    "csv_type": "products",
    "csv_file_key": "file_abc123",
    "csv_file_url": "https://utfs.io/f/file_abc123.csv",
    "csv_file_name": "products.csv",
    "csv_file_size": 1024567,
    "status": "processed",
    "created_at": "2026-01-04T12:00:00.000Z"
  },
  "message": "CSV file uploaded successfully to storage and SFTP server"
}
```

> **Note:** The `status` is `"processed"` because the file is immediately uploaded to your SFTP server. No background processing is needed.

#### Error Responses

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid parameters or file type |
| 403 | `LICENSE_EXPIRED` | License has expired |
| 403 | `LICENSE_REVOKED` | License has been revoked |
| 403 | `DOMAIN_MISMATCH` | Domain not activated for this license |
| 404 | `LICENSE_NOT_FOUND` | Invalid license key |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests (max 60/hour) |
| 500 | `INTERNAL_ERROR` | Server error (includes SFTP connection failures) |

---

### 2. List Upload Requests

Retrieve a paginated list of previous upload requests for status tracking.

```
GET /api/v2/nalda/csv-upload/list
```

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `license_key` | string | ✅ | License key |
| `domain` | string | ✅ | WordPress site domain |
| `page` | number | ❌ | Page number (default: 1) |
| `limit` | number | ❌ | Items per page (default: 10, max: 100) |
| `status` | string | ❌ | Filter: `pending`, `processing`, `processed`, `failed` |
| `csv_type` | string | ✅ | CSV type: `"orders"` or `"products"` |

#### PHP Example

```php
<?php
/**
 * List CSV upload requests from Nalda API
 *
 * @param string $license_key The license key
 * @param string $csv_type CSV type ('orders' or 'products')
 * @param int    $page Page number
 * @param int    $limit Items per page
 * @param string $status Optional status filter
 * @return array API response
 */
function nalda_list_requests( $license_key, $csv_type, $page = 1, $limit = 10, $status = null ) {
    $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda/csv-upload/list';
    $domain  = parse_url( home_url(), PHP_URL_HOST );

    $query_args = array(
        'license_key' => $license_key,
        'domain'      => $domain,
        'csv_type'    => $csv_type,
        'page'        => $page,
        'limit'       => $limit,
    );

    if ( $status ) {
        $query_args['status'] = $status;
    }

    $url = add_query_arg( $query_args, $api_url );

    $response = wp_remote_get( $url, array( 'timeout' => 30 ) );

    if ( is_wp_error( $response ) ) {
        return array(
            'success' => false,
            'error'   => array( 'message' => $response->get_error_message() ),
        );
    }

    return json_decode( wp_remote_retrieve_body( $response ), true );
}

// Usage
$result = nalda_list_requests( 'ABCD-1234-EFGH-5678', 'products', 1, 20 );

if ( $result['success'] ) {
    foreach ( $result['data']['requests'] as $request ) {
        echo sprintf(
            "ID: %s | File: %s | Status: %s\n",
            $request['id'],
            $request['csv_file_name'],
            $request['status']
        );
    }
    
    // Pagination info
    $pagination = $result['data']['pagination'];
    echo "Page {$pagination['page']} of {$pagination['total_pages']}";
}
```

#### Success Response (HTTP 200)

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "abc123xyz",
        "domain": "mysite.com",
        "csv_type": "products",
        "csv_file_key": "file_abc123",
        "csv_file_url": "https://utfs.io/f/file_abc123.csv",
        "csv_file_name": "products.csv",
        "csv_file_size": 1024567,
        "status": "processed",
        "processed_at": "2026-01-04T14:30:00.000Z",
        "error_message": null,
        "created_at": "2026-01-04T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "total_pages": 3,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

### 3. Validate SFTP Credentials

Test SFTP credentials before uploading. Use this to provide immediate feedback to users.

```
POST /api/v2/nalda/sftp-validate
Content-Type: application/json
```

#### Request Body

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "domain": "mysite.com",
  "hostname": "sftp.nalda.com",
  "port": 22,
  "username": "myuser",
  "password": "mypassword"
}
```

#### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `license_key` | string | ✅ | License key |
| `domain` | string | ✅ | WordPress site domain |
| `hostname` | string | ✅ | SFTP hostname (must be *.nalda.com) |
| `port` | number | ❌ | SFTP port (default: 22) |
| `username` | string | ✅ | SFTP username |
| `password` | string | ✅ | SFTP password |

#### PHP Example

```php
<?php
/**
 * Validate SFTP credentials with Nalda API
 *
 * @param string $license_key The license key
 * @param array  $sftp_config SFTP configuration
 * @return array API response
 */
function nalda_validate_sftp( $license_key, $sftp_config ) {
    $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda/sftp-validate';
    $domain  = parse_url( home_url(), PHP_URL_HOST );

    $response = wp_remote_post( $api_url, array(
        'headers' => array( 'Content-Type' => 'application/json' ),
        'body'    => wp_json_encode( array(
            'license_key' => $license_key,
            'domain'      => $domain,
            'hostname'    => $sftp_config['hostname'],
            'port'        => (int) ( $sftp_config['port'] ?? 22 ),
            'username'    => $sftp_config['username'],
            'password'    => $sftp_config['password'],
        ) ),
        'timeout' => 30,
    ) );

    if ( is_wp_error( $response ) ) {
        return array(
            'success' => false,
            'error'   => array( 'message' => $response->get_error_message() ),
        );
    }

    return json_decode( wp_remote_retrieve_body( $response ), true );
}

// Usage
$result = nalda_validate_sftp(
    'ABCD-1234-EFGH-5678',
    array(
        'hostname' => 'sftp.nalda.com',
        'port'     => 22,
        'username' => 'myuser',
        'password' => 'mypassword',
    )
);

if ( $result['success'] ) {
    echo 'SFTP connection successful!';
    echo 'Current directory: ' . $result['data']['serverInfo']['currentDirectory'];
} else {
    echo 'SFTP connection failed: ' . $result['error']['message'];
}
```

#### Success Response (HTTP 200)

```json
{
  "success": true,
  "data": {
    "hostname": "sftp.nalda.com",
    "port": 22,
    "username": "myuser",
    "connected": true,
    "serverInfo": {
      "currentDirectory": "/home/myuser"
    }
  },
  "message": "SFTP credentials are valid"
}
```

#### SFTP Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `HOST_NOT_FOUND` | Hostname could not be resolved |
| 400 | `CONNECTION_REFUSED` | Connection refused by server |
| 400 | `HOST_UNREACHABLE` | Host is unreachable |
| 400 | `CONNECTION_RESET` | Connection was reset |
| 400 | `PROTOCOL_ERROR` | SSH handshake failed |
| 401 | `AUTH_FAILED` | Invalid username or password |
| 408 | `CONNECTION_TIMEOUT` | Connection timed out (10s limit) |

---

## Request Status Values

| Status | Description |
|--------|-------------|
| `pending` | Request created, waiting in queue |
| `processing` | Currently being processed |
| `processed` | Successfully completed |
| `failed` | Failed (check `error_message` field) |

---

## Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error description",
    "details": {
      "field_name": ["Validation error for this field"]
    }
  }
}
```

---

## Rate Limiting

- **Limit:** 60 requests per hour per IP address
- **Headers included in responses:**
  - `X-RateLimit-Limit` - Maximum requests allowed
  - `X-RateLimit-Remaining` - Requests remaining
  - `X-RateLimit-Reset` - Unix timestamp when limit resets

---

## Complete Integration Example

Here's a complete PHP class for your WordPress plugin:

```php
<?php
/**
 * Nalda API Client for WordPress
 */
class Nalda_API_Client {

    private const API_BASE = 'https://license-manager-jonakyds.vercel.app/api/v2/nalda';

    private $license_key;
    private $domain;

    public function __construct( $license_key ) {
        $this->license_key = $license_key;
        $this->domain      = parse_url( home_url(), PHP_URL_HOST );
    }

    /**
     * Validate SFTP credentials
     */
    public function validate_sftp( $hostname, $username, $password, $port = 22 ) {
        return $this->post( '/sftp-validate', array(
            'license_key' => $this->license_key,
            'domain'      => $this->domain,
            'hostname'    => $hostname,
            'port'        => (int) $port,
            'username'    => $username,
            'password'    => $password,
        ) );
    }

    /**
     * Upload CSV file
     */
    public function upload_csv( $file_path, $csv_type, $sftp_host, $sftp_username, $sftp_password, $sftp_port = 22 ) {
        if ( ! file_exists( $file_path ) ) {
            return array(
                'success' => false,
                'error'   => array( 'message' => 'File not found: ' . $file_path ),
            );
        }

        $boundary = wp_generate_uuid4();
        $body     = $this->build_multipart_body( $boundary, array(
            'license_key'   => $this->license_key,
            'domain'        => $this->domain,
            'csv_type'      => $csv_type,
            'sftp_host'     => $sftp_host,
            'sftp_port'     => (string) $sftp_port,
            'sftp_username' => $sftp_username,
            'sftp_password' => $sftp_password,
        ), $file_path );

        $response = wp_remote_post( self::API_BASE . '/csv-upload', array(
            'headers' => array( 'Content-Type' => "multipart/form-data; boundary={$boundary}" ),
            'body'    => $body,
            'timeout' => 60,
        ) );

        return $this->handle_response( $response );
    }

    /**
     * List upload requests
     */
    public function list_requests( $csv_type, $page = 1, $limit = 10, $status = null ) {
        $args = array(
            'license_key' => $this->license_key,
            'domain'      => $this->domain,
            'csv_type'    => $csv_type,
            'page'        => $page,
            'limit'       => $limit,
        );

        if ( $status ) {
            $args['status'] = $status;
        }

        $url      = add_query_arg( $args, self::API_BASE . '/csv-upload/list' );
        $response = wp_remote_get( $url, array( 'timeout' => 30 ) );

        return $this->handle_response( $response );
    }

    /**
     * Get a specific request by ID
     */
    public function get_request_status( $request_id ) {
        $result = $this->list_requests( 1, 100 );

        if ( ! $result['success'] ) {
            return $result;
        }

        foreach ( $result['data']['requests'] as $request ) {
            if ( $request['id'] === $request_id ) {
                return array( 'success' => true, 'data' => $request );
            }
        }

        return array(
            'success' => false,
            'error'   => array( 'message' => 'Request not found' ),
        );
    }

    private function post( $endpoint, $data ) {
        $response = wp_remote_post( self::API_BASE . $endpoint, array(
            'headers' => array( 'Content-Type' => 'application/json' ),
            'body'    => wp_json_encode( $data ),
            'timeout' => 30,
        ) );

        return $this->handle_response( $response );
    }

    private function handle_response( $response ) {
        if ( is_wp_error( $response ) ) {
            return array(
                'success' => false,
                'error'   => array( 'message' => $response->get_error_message() ),
            );
        }

        return json_decode( wp_remote_retrieve_body( $response ), true );
    }

    private function build_multipart_body( $boundary, $fields, $file_path ) {
        $body = '';

        foreach ( $fields as $name => $value ) {
            $body .= "--{$boundary}\r\n";
            $body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
            $body .= "{$value}\r\n";
        }

        $file_name    = basename( $file_path );
        $file_content = file_get_contents( $file_path );

        $body .= "--{$boundary}\r\n";
        $body .= "Content-Disposition: form-data; name=\"csv_file\"; filename=\"{$file_name}\"\r\n";
        $body .= "Content-Type: text/csv\r\n\r\n";
        $body .= "{$file_content}\r\n";
        $body .= "--{$boundary}--\r\n";

        return $body;
    }
}
```

### Usage Example

```php
<?php
// Initialize client with license key
$nalda = new Nalda_API_Client( 'ABCD-1234-EFGH-5678' );

// Step 1: Validate SFTP credentials (optional but recommended)
$sftp_result = $nalda->validate_sftp( 'sftp.nalda.com', 'user', 'pass', 22 );

if ( ! $sftp_result['success'] ) {
    wp_die( 'SFTP Error: ' . $sftp_result['error']['message'] );
}

// Step 2: Upload CSV file
$upload_result = $nalda->upload_csv(
    '/path/to/products.csv',
    'products', // CSV type: 'orders' or 'products'
    'sftp.nalda.com',
    'user',
    'pass',
    22
);

if ( $upload_result['success'] ) {
    $request_id = $upload_result['data']['id'];
    update_option( 'nalda_last_request_id', $request_id );
    echo 'Upload successful! Request ID: ' . $request_id;
} else {
    echo 'Upload failed: ' . $upload_result['error']['message'];
}

// Step 3: Check status later
$status = $nalda->get_request_status( $request_id );

if ( $status['success'] ) {
    echo 'Status: ' . $status['data']['status'];
    
    if ( $status['data']['status'] === 'failed' ) {
        echo 'Error: ' . $status['data']['error_message'];
    }
}
```
