# License API v2 Documentation

## Overview

The License API v2 provides endpoints for managing software license activations. It's designed for **server-to-server communication** — plugin/theme backends should call these endpoints, NOT browser clients.

**Base URL:** `https://license-manager-jonakyds.vercel.app/api/v2/licenses`

**Version:** 2.0

## Important: Server-to-Server Only

This API is intended to be called from your plugin or theme's backend server, not directly from browsers. The API:
- Sets `X-API-Type: server-to-server` header
- Does not support CORS for browser requests
- Masks sensitive data (like customer emails) for privacy
- Should be called from PHP, Node.js, or other server-side code

## Authentication

Currently, these endpoints are public and rely on the secrecy of license keys. For production use, consider adding:
- API key authentication
- IP whitelisting

## Rate Limiting

Rate limiting is implemented using **Upstash Redis** (free tier: 10,000 commands/day).

### Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/activate` | 60 requests | per hour per IP |
| `/validate` | 60 requests | per hour per IP |
| `/deactivate` | 60 requests | per hour per IP |
| `/status` | 60 requests | per hour per IP |
| Failed attempts | 60 attempts | per hour per license key |

### Rate Limit Response

When rate limited, the API returns:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds."
  }
}
```

**HTTP Status:** `429 Too Many Requests`

**Headers:**
- `Retry-After`: Seconds until the limit resets
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when the limit resets

### Setup

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a Redis database
3. Add to your `.env`:
   ```
   UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-token
   ```

> **Note:** Rate limiting is automatically disabled if Upstash is not configured (useful for development).

## Common Response Format

All endpoints return responses in a consistent format:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field_name": ["Error message 1", "Error message 2"]
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid request parameters |
| `LICENSE_NOT_FOUND` | License key doesn't exist |
| `LICENSE_EXPIRED` | License has passed its expiration date |
| `LICENSE_REVOKED` | License has been manually revoked |
| `LICENSE_INACTIVE` | License is not active |
| `PRODUCT_NOT_FOUND` | Product doesn't match the license |
| `PRODUCT_INACTIVE` | Product has been deactivated |
| `DOMAIN_MISMATCH` | License is activated on a different domain |
| `DOMAIN_CHANGE_LIMIT_EXCEEDED` | No more domain changes allowed |
| `ALREADY_ACTIVATED` | License is already activated |
| `NOT_ACTIVATED` | License hasn't been activated yet |
| `ACTIVATION_NOT_FOUND` | No activation record found |
| `RATE_LIMIT_EXCEEDED` | Too many requests, try again later |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Endpoints

### 1. Activate License

Activates a license key on a specific domain.

**Endpoint:** `POST /api/v2/licenses/activate`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "my-awesome-plugin",
  "domain": "example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "example.com",
    "activated_at": "2024-01-15T10:30:00.000Z",
    "expires_at": "2025-01-15T10:30:00.000Z",
    "days_remaining": 365,
    "is_new_activation": true,
    "domain_changes_remaining": 3,
    "product": {
      "name": "My Awesome Plugin",
      "slug": "my-awesome-plugin",
      "type": "plugin"
    },
    "customer": {
      "name": "John Doe",
      "email": "j*******@e******.com"
    }
  },
  "message": "License activated successfully"
}
```

**Behavior:**

- **First activation:** Records activation time and calculates expiration date
- **Same domain:** Returns success without changes (idempotent)
- **Different domain:** Performs domain change if within limit

---

### 2. Validate License

Checks if a license is valid and properly activated on the requesting domain.

**Endpoint:** `POST /api/v2/licenses/validate`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "my-awesome-plugin",
  "domain": "example.com"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "example.com",
    "status": "active",
    "activated_at": "2024-01-15T10:30:00.000Z",
    "expires_at": "2025-01-15T10:30:00.000Z",
    "days_remaining": 350,
    "product": {
      "name": "My Awesome Plugin",
      "slug": "my-awesome-plugin",
      "type": "plugin"
    }
  },
  "message": "License is valid"
}
```

**Usage Notes:**

- Call this endpoint periodically (e.g., daily cron job or on admin page load)
- If `valid` is `false`, check the `status` and `message` for the reason
- Automatically marks expired licenses

---

### 3. Deactivate License

Removes a license from its current domain.

**Endpoint:** `POST /api/v2/licenses/deactivate`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "my-awesome-plugin",
  "domain": "example.com",
  "reason": "Moving to new server"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "example.com",
    "deactivated_at": "2024-02-01T15:00:00.000Z",
    "reason": "Moving to new server",
    "domain_changes_remaining": 3
  },
  "message": "License deactivated successfully"
}
```

**Important:**

- Deactivation does NOT count against the domain change limit
- Encourages proper deactivation before moving to a new domain
- Records reason for audit purposes

---

### 4. License Status

Returns complete information about a license.

**Endpoint:** `POST /api/v2/licenses/status`

**Request Body:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "my-awesome-plugin"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "status": "active",
    "customer": {
      "name": "John Doe",
      "email": "j*******@e******.com"
    },
    "product": {
      "name": "My Awesome Plugin",
      "slug": "my-awesome-plugin",
      "type": "plugin"
    },
    "activation": {
      "is_activated": true,
      "domain": "example.com",
      "activated_at": "2024-01-15T10:30:00.000Z"
    },
    "validity": {
      "validity_days": 365,
      "expires_at": "2025-01-15T10:30:00.000Z",
      "days_remaining": 350,
      "is_expired": false
    },
    "domain_changes": {
      "max_allowed": 3,
      "used": 0,
      "remaining": 3
    },
    "timestamps": {
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  },
  "message": "License status retrieved successfully"
}
```

**Usage Notes:**

- Does not require a domain parameter
- Useful for "License Info" panels
- Automatically updates expired status if needed

---

## Input Validation

### License Key Format

- Format: `XXXX-XXXX-XXXX-XXXX`
- Alphanumeric characters only (A-Z, 0-9)
- Case-insensitive (automatically uppercased)

### Product Slug Format

- Lowercase letters, numbers, and hyphens
- Example: `my-awesome-plugin`

### Domain Format

- Accepts with or without protocol (automatically stripped)
- Supports localhost, IP addresses, and ports
- Examples: `example.com`, `localhost:3000`, `192.168.1.1:8080`

---

## Example Integration (PHP)

```php
<?php
class LicenseManager {
    private $api_url = 'https://license-manager-jonakyds.vercel.app/api/v2/licenses';
    private $product_slug = 'my-awesome-plugin';
    
    public function activate($license_key) {
        $domain = parse_url(home_url(), PHP_URL_HOST);
        
        $response = wp_remote_post($this->api_url . '/activate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode([
                'license_key' => $license_key,
                'product_slug' => $this->product_slug,
                'domain' => $domain,
            ]),
        ]);
        
        return json_decode(wp_remote_retrieve_body($response), true);
    }
    
    public function validate($license_key) {
        $domain = parse_url(home_url(), PHP_URL_HOST);
        
        $response = wp_remote_post($this->api_url . '/validate', [
            'headers' => ['Content-Type' => 'application/json'],
            'body' => json_encode([
                'license_key' => $license_key,
                'product_slug' => $this->product_slug,
                'domain' => $domain,
            ]),
        ]);
        
        $data = json_decode(wp_remote_retrieve_body($response), true);
        
        return $data['success'] && $data['data']['valid'];
    }
}
```

---

## Example Integration (JavaScript)

```javascript
class LicenseClient {
  constructor(apiUrl, productSlug) {
    this.apiUrl = apiUrl;
    this.productSlug = productSlug;
  }

  async activate(licenseKey, domain) {
    const response = await fetch(`${this.apiUrl}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        product_slug: this.productSlug,
        domain: domain,
      }),
    });
    return response.json();
  }

  async validate(licenseKey, domain) {
    const response = await fetch(`${this.apiUrl}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        product_slug: this.productSlug,
        domain: domain,
      }),
    });
    const data = await response.json();
    return data.success && data.data.valid;
  }

  async deactivate(licenseKey, domain, reason) {
    const response = await fetch(`${this.apiUrl}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        product_slug: this.productSlug,
        domain: domain,
        reason: reason,
      }),
    });
    return response.json();
  }

  async status(licenseKey) {
    const response = await fetch(`${this.apiUrl}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        license_key: licenseKey,
        product_slug: this.productSlug,
      }),
    });
    return response.json();
  }
}

// Usage
const client = new LicenseClient(
  'https://license-manager-jonakyds.vercel.app/api/v2/licenses',
  'my-awesome-plugin'
);
```

---

## Security Considerations

1. **Server-to-Server Only:** This API is designed for backend-to-backend communication, not browser clients
2. **HTTPS Only:** Always use HTTPS in production
3. **Email Masking:** Customer emails are automatically masked (e.g., `j*******@e******.com`) for privacy
4. **Rate Limiting:** Implemented via Upstash Redis with per-IP and per-license-key limits
5. **Brute Force Protection:** Failed validation attempts are tracked and blocked after 5 failures
6. **IP Logging:** API logs IP addresses for audit purposes
7. **License Key Secrecy:** Treat license keys like passwords
8. **No Browser Caching:** Responses include `Cache-Control: no-store` headers

---

## Changelog

### v2.0 (Current)
- Initial versioned release
- Server-to-server architecture (not for browser use)
- Customer email masking for privacy
- **Rate limiting via Upstash Redis**
- **Brute force protection for failed attempts**
- Consistent JSON response format
- Comprehensive validation with Zod schemas
- Auto-expiration handling
- Domain change tracking
- Audit logging for deactivations
