# License API - Plugin Integration Guide

A complete guide for integrating license validation into your WordPress plugins and themes.

## Quick Start

**Base URL:** `https://license-manager-jonakyds.vercel.app/api/v2/licenses`

```php
// 1. Activate license when user enters key
$result = $this->activate_license('XXXX-XXXX-XXXX-XXXX');

// 2. Validate periodically (daily cron)
$is_valid = $this->validate_license('XXXX-XXXX-XXXX-XXXX');

// 3. Show status in settings page
$status = $this->get_license_status('XXXX-XXXX-XXXX-XXXX');
```

---

## Table of Contents

- [Overview](#overview)
- [API Endpoints](#api-endpoints)
  - [Activate License](#1-activate-license)
  - [Validate License](#2-validate-license)
  - [Deactivate License](#3-deactivate-license)
  - [Get Status](#4-license-status)
- [Complete PHP Class](#complete-php-class-for-wordpress)
- [Implementation Examples](#implementation-examples)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

This API manages software license activations for your plugins/themes. It's designed for **server-to-server communication** — your plugin's PHP code calls these endpoints, NOT the browser.

### Key Features

- ✅ Domain-locked licenses (one domain per license)
- ✅ Automatic expiration handling
- ✅ Domain change support (configurable limit)
- ✅ Rate limiting protection
- ✅ Privacy-first (emails are masked)

### How It Works

1. **User purchases** → You create a license in the admin panel
2. **User enters key** → Plugin calls `/activate` endpoint
3. **Daily validation** → Plugin calls `/validate` to check if still valid
4. **User moves site** → Plugin calls `/deactivate`, then `/activate` on new domain

---

## API Endpoints

### 1. Activate License

Activates a license key on the current domain. Call this when the user enters their license key.

**Endpoint:** `POST /api/v2/licenses/activate`

**Request:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "your-plugin-slug",
  "domain": "customer-site.com"
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "customer-site.com",
    "activated_at": "2026-01-04T10:30:00.000Z",
    "expires_at": "2027-01-04T10:30:00.000Z",
    "days_remaining": 365,
    "is_new_activation": true,
    "domain_changes_remaining": 3,
    "product": {
      "name": "Your Plugin Pro",
      "slug": "your-plugin-slug",
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

| Scenario | Result |
|----------|--------|
| First activation | Sets `activated_at`, calculates `expires_at`, returns `is_new_activation: true` |
| Same domain again | Returns success with `is_new_activation: false` (safe to call multiple times) |
| Different domain | Performs domain change if limit not exceeded |

---

### 2. Validate License

Checks if a license is currently valid. **Call this daily** (via cron) and on admin pages.

**Endpoint:** `POST /api/v2/licenses/validate`

**Request:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "your-plugin-slug",
  "domain": "customer-site.com"
}
```

**Valid License Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "customer-site.com",
    "status": "active",
    "activated_at": "2026-01-04T10:30:00.000Z",
    "expires_at": "2027-01-04T10:30:00.000Z",
    "days_remaining": 350,
    "product": {
      "name": "Your Plugin Pro",
      "slug": "your-plugin-slug",
      "type": "plugin"
    }
  },
  "message": "License is valid"
}
```

**Invalid License Response (expired/revoked):**

```json
{
  "success": true,
  "data": {
    "valid": false,
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "customer-site.com",
    "status": "expired",
    "days_remaining": 0,
    ...
  },
  "message": "License has expired"
}
```

> **Important:** Check `data.valid`, not just `success`. Expired licenses return `success: true` with `valid: false`.

---

### 3. Deactivate License

Removes the license from the current domain. Call this before moving to a new domain.

**Endpoint:** `POST /api/v2/licenses/deactivate`

**Request:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "your-plugin-slug",
  "domain": "customer-site.com",
  "reason": "Moving to new server"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "license_key": "XXXX-XXXX-XXXX-XXXX",
    "domain": "customer-site.com",
    "deactivated_at": "2026-02-01T15:00:00.000Z",
    "reason": "Moving to new server",
    "domain_changes_remaining": 3
  },
  "message": "License deactivated successfully"
}
```

> **Note:** Deactivation does NOT count against domain change limit. Encourage users to deactivate before moving.

---

### 4. License Status

Get complete license information. Use for settings pages.

**Endpoint:** `POST /api/v2/licenses/status`

**Request:**

```json
{
  "license_key": "XXXX-XXXX-XXXX-XXXX",
  "product_slug": "your-plugin-slug"
}
```

**Response:**

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
      "name": "Your Plugin Pro",
      "slug": "your-plugin-slug",
      "type": "plugin"
    },
    "activation": {
      "is_activated": true,
      "domain": "customer-site.com",
      "activated_at": "2026-01-04T10:30:00.000Z"
    },
    "validity": {
      "validity_days": 365,
      "expires_at": "2027-01-04T10:30:00.000Z",
      "days_remaining": 350,
      "is_expired": false
    },
    "domain_changes": {
      "max_allowed": 3,
      "used": 0,
      "remaining": 3
    },
    "timestamps": {
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-04T10:30:00.000Z"
    }
  },
  "message": "License status retrieved successfully"
}
```

---

## Complete PHP Class for WordPress

Copy this class into your plugin:

```php
<?php
/**
 * License Manager for WordPress Plugins/Themes
 * 
 * @package YourPlugin
 */

if (!defined('ABSPATH')) {
    exit;
}

class Your_Plugin_License {
    
    /**
     * API Configuration
     */
    private const API_URL = 'https://license-manager-jonakyds.vercel.app/api/v2/licenses';
    private const PRODUCT_SLUG = 'your-plugin-slug'; // Change this!
    
    /**
     * Option names for storing license data
     */
    private const OPTION_KEY = 'your_plugin_license_key';
    private const OPTION_DATA = 'your_plugin_license_data';
    private const OPTION_VALID = 'your_plugin_license_valid';
    private const OPTION_CHECKED = 'your_plugin_license_checked';
    
    /**
     * Get the current site domain
     */
    private function get_domain(): string {
        $domain = parse_url(home_url(), PHP_URL_HOST);
        // Remove www. prefix for consistency
        return preg_replace('/^www\./', '', $domain);
    }
    
    /**
     * Make API request
     */
    private function api_request(string $endpoint, array $body): array {
        $response = wp_remote_post(self::API_URL . $endpoint, [
            'headers' => [
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode($body),
            'timeout' => 30,
        ]);
        
        if (is_wp_error($response)) {
            return [
                'success' => false,
                'error' => [
                    'code' => 'CONNECTION_ERROR',
                    'message' => $response->get_error_message(),
                ],
            ];
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return [
                'success' => false,
                'error' => [
                    'code' => 'INVALID_RESPONSE',
                    'message' => 'Invalid response from license server',
                ],
            ];
        }
        
        return $data;
    }
    
    /**
     * Activate license
     * Call when user submits license key
     */
    public function activate(string $license_key): array {
        $license_key = strtoupper(trim($license_key));
        
        $result = $this->api_request('/activate', [
            'license_key' => $license_key,
            'product_slug' => self::PRODUCT_SLUG,
            'domain' => $this->get_domain(),
        ]);
        
        if ($result['success']) {
            // Store license data
            update_option(self::OPTION_KEY, $license_key);
            update_option(self::OPTION_DATA, $result['data']);
            update_option(self::OPTION_VALID, true);
            update_option(self::OPTION_CHECKED, time());
        }
        
        return $result;
    }
    
    /**
     * Validate license
     * Call daily via cron and on settings page load
     */
    public function validate(): bool {
        $license_key = get_option(self::OPTION_KEY);
        
        if (empty($license_key)) {
            return false;
        }
        
        $result = $this->api_request('/validate', [
            'license_key' => $license_key,
            'product_slug' => self::PRODUCT_SLUG,
            'domain' => $this->get_domain(),
        ]);
        
        // Update validation timestamp
        update_option(self::OPTION_CHECKED, time());
        
        // Check if license is valid
        $is_valid = $result['success'] && 
                    isset($result['data']['valid']) && 
                    $result['data']['valid'] === true;
        
        update_option(self::OPTION_VALID, $is_valid);
        
        return $is_valid;
    }
    
    /**
     * Deactivate license
     * Call when user wants to move to different domain
     */
    public function deactivate(string $reason = ''): array {
        $license_key = get_option(self::OPTION_KEY);
        
        if (empty($license_key)) {
            return [
                'success' => false,
                'error' => ['message' => 'No license key found'],
            ];
        }
        
        $body = [
            'license_key' => $license_key,
            'product_slug' => self::PRODUCT_SLUG,
            'domain' => $this->get_domain(),
        ];
        
        if (!empty($reason)) {
            $body['reason'] = $reason;
        }
        
        $result = $this->api_request('/deactivate', $body);
        
        if ($result['success']) {
            // Clear stored license data
            delete_option(self::OPTION_KEY);
            delete_option(self::OPTION_DATA);
            delete_option(self::OPTION_VALID);
            delete_option(self::OPTION_CHECKED);
        }
        
        return $result;
    }
    
    /**
     * Get license status
     * Call for settings page display
     */
    public function get_status(): array {
        $license_key = get_option(self::OPTION_KEY);
        
        if (empty($license_key)) {
            return [
                'success' => false,
                'error' => ['message' => 'No license key found'],
            ];
        }
        
        return $this->api_request('/status', [
            'license_key' => $license_key,
            'product_slug' => self::PRODUCT_SLUG,
        ]);
    }
    
    /**
     * Check if license is valid (uses cached value)
     * Call to gate premium features
     */
    public function is_valid(): bool {
        return (bool) get_option(self::OPTION_VALID, false);
    }
    
    /**
     * Get stored license data
     */
    public function get_license_data(): ?array {
        return get_option(self::OPTION_DATA, null);
    }
    
    /**
     * Check if needs validation (older than 24 hours)
     */
    public function needs_validation(): bool {
        $last_checked = get_option(self::OPTION_CHECKED, 0);
        return (time() - $last_checked) > DAY_IN_SECONDS;
    }
}
```

---

## Implementation Examples

### 1. Settings Page Integration

```php
<?php
// In your plugin settings page

$license = new Your_Plugin_License();

// Handle form submission
if (isset($_POST['activate_license'])) {
    check_admin_referer('your_plugin_license');
    $result = $license->activate(sanitize_text_field($_POST['license_key']));
    
    if ($result['success']) {
        add_settings_error('your_plugin', 'license_activated', 
            'License activated successfully!', 'success');
    } else {
        add_settings_error('your_plugin', 'license_error', 
            $result['error']['message'], 'error');
    }
}

if (isset($_POST['deactivate_license'])) {
    check_admin_referer('your_plugin_license');
    $result = $license->deactivate('User deactivated from settings');
    
    if ($result['success']) {
        add_settings_error('your_plugin', 'license_deactivated', 
            'License deactivated successfully!', 'success');
    }
}

// Display license status
$status = $license->get_status();
?>

<div class="wrap">
    <h1>License Settings</h1>
    
    <?php settings_errors('your_plugin'); ?>
    
    <?php if ($license->is_valid()): ?>
        <div class="notice notice-success">
            <p><strong>License Active</strong></p>
            <?php if (isset($status['data'])): ?>
                <p>Expires: <?php echo date('F j, Y', strtotime($status['data']['validity']['expires_at'])); ?></p>
                <p>Days Remaining: <?php echo $status['data']['validity']['days_remaining']; ?></p>
            <?php endif; ?>
        </div>
        
        <form method="post">
            <?php wp_nonce_field('your_plugin_license'); ?>
            <p><input type="submit" name="deactivate_license" class="button" 
                value="Deactivate License" 
                onclick="return confirm('Are you sure? You can reactivate on another domain.');" /></p>
        </form>
        
    <?php else: ?>
        <form method="post">
            <?php wp_nonce_field('your_plugin_license'); ?>
            <table class="form-table">
                <tr>
                    <th>License Key</th>
                    <td>
                        <input type="text" name="license_key" class="regular-text" 
                            placeholder="XXXX-XXXX-XXXX-XXXX" />
                    </td>
                </tr>
            </table>
            <p><input type="submit" name="activate_license" class="button button-primary" 
                value="Activate License" /></p>
        </form>
    <?php endif; ?>
</div>
```

### 2. Daily Cron Validation

```php
<?php
// Register cron on activation
register_activation_hook(__FILE__, function() {
    if (!wp_next_scheduled('your_plugin_daily_license_check')) {
        wp_schedule_event(time(), 'daily', 'your_plugin_daily_license_check');
    }
});

// Clear cron on deactivation
register_deactivation_hook(__FILE__, function() {
    wp_clear_scheduled_hook('your_plugin_daily_license_check');
});

// Cron callback
add_action('your_plugin_daily_license_check', function() {
    $license = new Your_Plugin_License();
    $license->validate();
});

// Also validate on admin page load if stale
add_action('admin_init', function() {
    if (!is_admin()) return;
    
    $license = new Your_Plugin_License();
    if ($license->needs_validation()) {
        $license->validate();
    }
});
```

### 3. Gating Premium Features

```php
<?php
// Check before enabling premium features
$license = new Your_Plugin_License();

if ($license->is_valid()) {
    // Enable premium feature
    add_action('init', 'your_plugin_premium_features');
} else {
    // Show upgrade notice
    add_action('admin_notices', function() {
        echo '<div class="notice notice-warning"><p>';
        echo 'Upgrade to Pro for premium features. ';
        echo '<a href="' . admin_url('admin.php?page=your-plugin-license') . '">Enter License Key</a>';
        echo '</p></div>';
    });
}
```

---

## Error Handling

### Error Codes Reference

| Code | HTTP | When It Happens | What To Do |
|------|------|-----------------|------------|
| `LICENSE_NOT_FOUND` | 404 | Key doesn't exist | Check for typos |
| `LICENSE_EXPIRED` | 403 | License expired | Prompt renewal |
| `LICENSE_REVOKED` | 403 | Manually revoked | Contact support |
| `PRODUCT_NOT_FOUND` | 404 | Wrong product_slug | Check your config |
| `PRODUCT_INACTIVE` | 403 | Product disabled | Contact support |
| `NOT_ACTIVATED` | 400/403 | Never activated | Call activate first |
| `DOMAIN_MISMATCH` | 400/403 | Wrong domain | Deactivate and reactivate |
| `DOMAIN_CHANGE_LIMIT_EXCEEDED` | 403 | Too many moves | Contact support |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `VALIDATION_ERROR` | 400 | Invalid input | Check request format |

### Handling Errors in PHP

```php
$result = $license->activate($key);

if (!$result['success']) {
    $error_code = $result['error']['code'] ?? 'UNKNOWN';
    $error_message = $result['error']['message'] ?? 'An error occurred';
    
    switch ($error_code) {
        case 'LICENSE_NOT_FOUND':
            $user_message = 'Invalid license key. Please check and try again.';
            break;
        case 'LICENSE_EXPIRED':
            $user_message = 'Your license has expired. Please renew to continue.';
            break;
        case 'DOMAIN_CHANGE_LIMIT_EXCEEDED':
            $user_message = 'Domain change limit reached. Please contact support.';
            break;
        case 'RATE_LIMIT_EXCEEDED':
            $user_message = 'Too many attempts. Please wait a few minutes.';
            break;
        default:
            $user_message = $error_message;
    }
    
    // Log for debugging
    error_log("License error: {$error_code} - {$error_message}");
}
```

---

## Best Practices

### ✅ Do

- **Cache validation results** — Don't call API on every page load
- **Use daily cron** — Validate once per day, not on every request  
- **Store license data** — Save API response in options for quick access
- **Handle offline gracefully** — If API is unreachable, use cached validity
- **Sanitize input** — Always sanitize license keys before sending
- **Show helpful errors** — Translate error codes to user-friendly messages

### ❌ Don't

- **Don't call from browser** — Always use server-side PHP, never JavaScript
- **Don't validate on every page** — Use cached `is_valid()` for feature gating
- **Don't expose API in frontend** — Keep license key server-side only
- **Don't hardcode keys** — Let users enter their own key

### Performance Tips

```php
// GOOD: Use cached value for feature checks
if ($license->is_valid()) {
    // Enable feature
}

// BAD: Don't call API on every check
if ($license->validate()) { // This makes an API call!
    // Enable feature
}
```

---

## Input Validation

### License Key Format
- Pattern: `XXXX-XXXX-XXXX-XXXX`
- Characters: A-Z, 0-9 (alphanumeric)
- Case: Automatically uppercased

### Product Slug Format
- Characters: a-z, 0-9, hyphens
- Example: `my-awesome-plugin`

### Domain Format
- Protocols stripped automatically
- Supports: domains, localhost, IPs with ports
- Examples: `example.com`, `localhost:3000`

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| All endpoints | 60 requests | per hour per IP |

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds."
  }
}
```

**Headers included:**
- `Retry-After`: Seconds to wait
- `X-RateLimit-Remaining`: Requests left

---

## Support

For issues with the License API, check:
1. Correct `product_slug` configuration
2. Valid license key format
3. Domain matches the activated domain
4. License hasn't expired or been revoked

For technical issues, contact the API administrator.
