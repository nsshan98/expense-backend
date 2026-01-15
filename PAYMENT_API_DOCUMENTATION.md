# Payment System API Documentation

## 📋 Table of Contents
1. [Admin - Plan Management](#admin---plan-management)
2. [Admin - Price Management](#admin---price-management)
3. [Admin - Coupon Management](#admin---coupon-management)
4. [Public - Pricing API](#public---pricing-api)
5. [Webhooks - Paddle](#webhooks---paddle)
6. [Manual Billing / Local Payments](#manual-billing--local-payments)


---

## Admin - Plan Management

### 1. Create Plan
**POST** `/admin/plans`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": {
    "max_categories": 50,
    "max_budgets": 20,
    "max_transactions": -1,
    "max_subscriptions": -1,
    "is_premium": true
  },
  "is_paddle_enabled": true,
  "paddle_tax_category": "saas",
  "paddle_image_url": "https://example.com/premium.png"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": { ... },
  "is_paddle_enabled": true,
  "paddle_product_id": "pro_01h1vjes1y163xfj1rh1tkfb65",
  "created_at": "2026-01-11T17:05:00Z",
  "updated_at": "2026-01-11T17:05:00Z"
}
```

---

### 2. Get All Plans
**GET** `/admin/plans`

**Authentication:** Required (JWT)

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Free Plan",
    "plan_key": "free",
    "display_features": "Basic features",
    "features": { ... },
    "is_paddle_enabled": false,
    "paddle_product_id": null,
    "created_at": "2026-01-11T17:05:00Z",
    "updated_at": "2026-01-11T17:05:00Z"
  },
  {
    "id": "uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access",
    "features": { ... },
    "is_paddle_enabled": true,
    "paddle_product_id": "pro_01h1vjes1y163xfj1rh1tkfb65",
    "created_at": "2026-01-11T17:05:00Z",
    "updated_at": "2026-01-11T17:05:00Z"
  }
]
```

---

### 3. Get Plan by ID
**GET** `/admin/plans/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": { ... },
  "is_paddle_enabled": true,
  "paddle_product_id": "pro_01h1vjes1y163xfj1rh1tkfb65",
  "created_at": "2026-01-11T17:05:00Z",
  "updated_at": "2026-01-11T17:05:00Z"
}
```

---

### 4. Update Plan
**PATCH** `/admin/plans/:id`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "name": "Premium Plus Plan",
  "display_features": "Enhanced premium features",
  "features": {
    "max_categories": 100,
    "max_budgets": 50,
    "max_transactions": -1,
    "max_subscriptions": -1,
    "is_premium": true
  },
  "is_paddle_enabled": true,
  "paddle_image_url": "https://example.com/premium-plus.png"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Premium Plus Plan",
  "plan_key": "premium",
  "display_features": "Enhanced premium features",
  "features": { ... },
  "is_paddle_enabled": true,
  "paddle_product_id": "pro_01h1vjes1y163xfj1rh1tkfb65",
  "created_at": "2026-01-11T17:05:00Z",
  "updated_at": "2026-01-11T17:10:00Z"
}
```

---

### 5. Delete Plan
**DELETE** `/admin/plans/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "message": "Plan deleted successfully"
}
```

---

### 6. Enable Paddle for Plan
**POST** `/admin/plans/:id/enable-paddle`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "taxCategory": "saas",
  "imageUrl": "https://example.com/plan.png"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access",
  "features": { ... },
  "is_paddle_enabled": true,
  "paddle_product_id": "pro_01h1vjes1y163xfj1rh1tkfb65",
  "created_at": "2026-01-11T17:05:00Z",
  "updated_at": "2026-01-11T17:15:00Z"
}
```

---

## Admin - Price Management

### 1. Create Price
**POST** `/admin/prices`

**Authentication:** Required (JWT)

**Request Body (Manual Price):**
```json
{
  "plan_id": "uuid",
  "provider": "manual",
  "interval": "monthly",
  "currency": "USD",
  "amount": 9.99,
  "description": "Monthly subscription"
}
```

**Request Body (Paddle Price):**
```json
{
  "plan_id": "uuid",
  "provider": "paddle",
  "interval": "yearly",
  "currency": "USD",
  "amount": 99.99,
  "description": "Yearly subscription",
  "billing_cycle": {
    "interval": "year",
    "frequency": 1
  },
  "trial_period": {
    "interval": "day",
    "frequency": 14
  },
  "name": "Yearly Pro",
  "min_quantity": 1,
  "max_quantity": 100,
  "unit_price_overrides": [
    {
      "countryCodes": ["GB", "CA"],
      "unitPrice": {
        "amount": "8500",
        "currency_code": "GBP"
      }
    }
  ]
}
```

**Response:**
```json
{
  "id": "ed633c9b-502b-4e99-92b6-044576be4065",
  "plan_id": 1,
  "provider": "paddle",
  "interval": "yearly",
  "currency": "USD",
  "amount": "99.99",
  "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 2. Get All Prices
**GET** `/admin/prices`

**Authentication:** Required (JWT)

**Query Parameters:**
- `planId` (optional): Filter by plan ID
- `active` (optional): Filter by active status (`true` or `false`)

**Note:** Results are sorted by creation date in descending order (newest first).

**Response:**
```json
[
  {
    "id": 1,
    "plan_id": 1,
    "provider": "manual",
    "interval": "monthly",
    "currency": "USD",
    "amount": "9.99",
    "paddle_price_id": null,
    "created_at": "2026-01-11T17:05:00Z"
  },
  {
    "id": 2,
    "plan_id": 1,
    "provider": "paddle",
    "interval": "yearly",
    "currency": "USD",
    "amount": "99.99",
    "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
    "name": "Yearly Pro",
    "min_quantity": 1,
    "max_quantity": 100,
    "unit_price_overrides": [
      {
        "countryCodes": ["GB"],
        "unitPrice": {
          "amount": "8500",
          "currency_code": "GBP"
        }
      }
    ],
    "created_at": "2026-01-11T17:05:00Z"
  }
]
```

---

### 3. Get Price by ID
**GET** `/admin/prices/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "ed633c9b-502b-4e99-92b6-044576be4065",
  "plan_id": 1,
  "provider": "paddle",
  "interval": "monthly",
  "currency": "USD",
  "amount": "9.99",
  "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
  "name": "Monthly Pro",
  "min_quantity": 1,
  "max_quantity": null,
  "unit_price_overrides": null,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 4. Update Price
**PATCH** `/admin/prices/:id`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "description": "Updated monthly subscription",
  "amount": 12.99,
  "currency": "USD",
  "name": "Updated Name",
  "min_quantity": 5,
  "max_quantity": 50,
  "unit_price_overrides": [
    {
      "countryCodes": ["GB"],
      "unitPrice": {
        "amount": "8500",
        "currency_code": "GBP"
      }
    }
  ]
}
```



**Response:**
```json
{
  "id": "ed633c9b-502b-4e99-92b6-044576be4065",
  "plan_id": 1,
  "provider": "manual",
  "interval": "monthly",
  "currency": "USD",
  "amount": "12.99",
  "paddle_price_id": null,
  "name": "Updated Name",
  "min_quantity": 5,
  "max_quantity": 50,
  "unit_price_overrides": null,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 5. Delete Price
**DELETE** `/admin/prices/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "ed633c9b-502b-4e99-92b6-044576be4065",
  "plan_id": 1,
  "provider": "manual",
  "is_active": false,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 6. Reactivate Price
**POST** `/admin/prices/:id/reactivate`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": "ed633c9b-502b-4e99-92b6-044576be4065",
  "plan_id": 1,
  "provider": "manual",
  "is_active": true,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

## Admin - Coupon Management

### 1. Create Coupon
**POST** `/admin/coupons`

**Authentication:** Required (JWT)

**Request Body (Manual Coupon - Percentage):**
```json
{
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": 20,
  "description": "20% off all plans",
  "max_uses": 100,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**Request Body (Manual Coupon - Flat):**
```json
{
  "code": "FLAT10",
  "provider": "manual",
  "discount_type": "flat",
  "discount_amount": 10,
  "currency": "USD",
  "description": "$10 off",
  "max_uses": 50,
  "expires_at": "2026-06-30T23:59:59Z"
}
```

**Request Body (Paddle Coupon):**
```json
{
  "code": "PADDLE25",
  "provider": "paddle",
  "discount_type": "percentage",
  "discount_amount": 25,
  "description": "25% off via Paddle",
  "enabled_for_checkout": true,
  "recur": true,
  "maximum_recurring_intervals": 3,
  "max_uses": 200,
  "expires_at": "2026-12-31T23:59:59Z",
  "restrict_to": ["pri_01h1vjfevh5etwq3rb1cq1c1q7"]
}
```

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 0,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true,
  "recur": false,
  "maximum_recurring_intervals": null,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 2. Get All Coupons
**GET** `/admin/coupons`

**Authentication:** Required (JWT)

**Query Parameters:**
- `active` (optional): Filter by active status (`true` or `false`)

**Note:** Results are sorted by creation date in descending order (newest first).

**Response:**
```json
[
  {
    "id": 1,
    "code": "SAVE20",
    "provider": "manual",
    "discount_type": "percentage",
    "discount_amount": "20",
    "currency": null,
    "paddle_discount_id": null,
    "max_uses": 100,
    "times_used": 15,
    "expires_at": "2026-12-31T23:59:59Z",
    "is_active": true,
    "recur": false,
    "maximum_recurring_intervals": null,
    "created_at": "2026-01-11T17:05:00Z"
  },
  {
    "id": 2,
    "code": "PADDLE25",
    "provider": "paddle",
    "discount_type": "percentage",
    "discount_amount": "25",
    "currency": null,
    "paddle_discount_id": "dsc_01h1vjfevh5etwq3rb1cq1c1q7",
    "max_uses": 200,
    "times_used": 42,
    "expires_at": "2026-12-31T23:59:59Z",
    "is_active": true,
    "recur": true,
    "maximum_recurring_intervals": 3,
    "created_at": "2026-01-11T17:05:00Z"
  }
]
```

---

### 3. Get Coupon by ID
**GET** `/admin/coupons/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true,
  "recur": false,
  "maximum_recurring_intervals": null,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 4. Get Coupon by Code
**GET** `/admin/coupons/code/:code`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true,
  "recur": false,
  "maximum_recurring_intervals": null,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 5. Update Coupon
**PATCH** `/admin/coupons/:id`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "description": "Updated 20% discount",
  "is_active": true,
  "expires_at": "2027-12-31T23:59:59Z",
  "discount_amount": 25,
  "discount_type": "flat",
  "currency": "USD",
  "max_uses": 200,
  "enabled_for_checkout": true,
  "recur": true,
  "maximum_recurring_intervals": 3
}
```

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2027-12-31T23:59:59Z",
  "is_active": true,
  "recur": true,
  "maximum_recurring_intervals": 3,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 6. Delete Coupon
**DELETE** `/admin/coupons/:id`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "message": "Coupon deleted successfully"
}
```

---

### 7. Deactivate Coupon
**POST** `/admin/coupons/:id/deactivate`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": false,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 8. Reactivate Coupon
**POST** `/admin/coupons/:id/reactivate`

**Authentication:** Required (JWT)

**Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true,
  "created_at": "2026-01-11T17:05:00Z"
}
```

---

### 9. Validate Coupon
**POST** `/admin/coupons/validate`

**Authentication:** Required (JWT)

**Request Body:**
```json
{
  "code": "SAVE20"
}
```

**Success Response:**
```json
{
  "id": 1,
  "code": "SAVE20",
  "provider": "manual",
  "discount_type": "percentage",
  "discount_amount": "20",
  "currency": null,
  "paddle_discount_id": null,
  "max_uses": 100,
  "times_used": 15,
  "expires_at": "2026-12-31T23:59:59Z",
  "is_active": true,
  "created_at": "2026-01-11T17:05:00Z"
}
```

**Error Response (Expired):**
```json
{
  "statusCode": 400,
  "message": "Coupon has expired",
  "error": "Bad Request"
}
```

**Error Response (Usage Limit):**
```json
{
  "statusCode": 400,
  "message": "Coupon usage limit reached",
  "error": "Bad Request"
}
```

---

## Public - Pricing API

### 1. Get All Public Pricing
**GET** `/pricing`

**Authentication:** Not Required

**Query Parameters:**
- `interval` (optional): Filter prices by billing interval (`monthly`, `yearly`, `one-time`)
- `countryCode` (optional): Get country-specific pricing (e.g., `BD`, `US`, `GB`). Requires `interval` to be specified.

**Examples:**

**Default (All Prices):**
```
GET /pricing
```

**Filter by Interval:**
```
GET /pricing?interval=monthly
```

**Filter by Interval and Country:**
```
GET /pricing?interval=yearly&countryCode=BD
```

**Response (Default - All Prices):**
```json
[
  {
    "id": "uuid",
    "name": "Free Plan",
    "plan_key": "free",
    "display_features": "Basic features",
    "features": {
      "max_categories": 5,
      "max_budgets": 3,
      "max_transactions": 100,
      "max_subscriptions": 5,
      "is_premium": false
    },
    "is_paddle_enabled": false,
    "prices": {
      "monthly": [],
      "yearly": []
    }
  },
  {
    "id": "uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access to all features",
    "features": {
      "max_categories": 50,
      "max_budgets": 20,
      "max_transactions": -1,
      "max_subscriptions": -1,
      "is_premium": true
    },
    "is_paddle_enabled": true,
    "prices": {
      "monthly": [
        {
          "id": "uuid",
          "provider": "paddle",
          "currency": "USD",
          "amount": 2,
          "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
          "unit_price_overrides": [
            {
              "country_codes": ["BD"],
              "unit_price": {
                "amount": "1",
                "currency_code": "USD"
              }
            }
          ]
        }
      ],
      "yearly": [
        {
          "id": "uuid",
          "provider": "paddle",
          "currency": "USD",
          "amount": 10,
          "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q8",
          "unit_price_overrides": [
            {
              "country_codes": ["BD"],
              "unit_price": {
                "amount": "5",
                "currency_code": "USD"
              }
            }
          ]
        }
      ]
    }
  }
]
```

**Response (Filtered by Interval - `?interval=monthly`):**
```json
[
  {
    "id": "uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access to all features",
    "features": { ... },
    "is_paddle_enabled": true,
    "prices": [
      {
        "id": "uuid",
        "provider": "paddle",
        "currency": "USD",
        "amount": 2,
        "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7"
      }
    ]
  }
]
```

**Response (Filtered by Interval and Country - `?interval=yearly&countryCode=BD`):**
```json
[
  {
    "id": "uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access to all features",
    "features": { ... },
    "is_paddle_enabled": true,
    "prices": [
      {
        "id": "uuid",
        "provider": "paddle",
        "currency": "USD",
        "amount": 5,
        "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q8",
        "country_code": "BD"
      }
    ]
  }
]
```

---

### 2. Get Pricing for Specific Plan
**GET** `/pricing/:planId`

**Authentication:** Not Required

**Query Parameters:**
- `interval` (optional): Filter prices by billing interval (`monthly`, `yearly`, `one-time`)
- `countryCode` (optional): Get country-specific pricing (e.g., `BD`, `US`, `GB`). Requires `interval` to be specified.

**Examples:**

**Default (All Prices):**
```
GET /pricing/{planId}
```

**Filter by Interval:**
```
GET /pricing/{planId}?interval=monthly
```

**Filter by Interval and Country:**
```
GET /pricing/{planId}?interval=yearly&countryCode=BD
```

**Response (Default - All Prices):**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": {
    "max_categories": 50,
    "max_budgets": 20,
    "max_transactions": -1,
    "max_subscriptions": -1,
    "is_premium": true
  },
  "is_paddle_enabled": true,
  "prices": {
    "monthly": [
      {
        "id": "uuid",
        "provider": "paddle",
        "currency": "USD",
        "amount": 2,
        "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
        "unit_price_overrides": [
          {
            "country_codes": ["BD"],
            "unit_price": {
              "amount": "1",
              "currency_code": "USD"
            }
          }
        ]
      }
    ],
    "yearly": [
      {
        "id": "uuid",
        "provider": "paddle",
        "currency": "USD",
        "amount": 10,
        "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q8",
        "unit_price_overrides": [
          {
            "country_codes": ["BD"],
            "unit_price": {
              "amount": "5",
              "currency_code": "USD"
            }
          }
        ]
      }
    ]
  }
}
```

**Response (Filtered by Interval - `?interval=monthly`):**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": { ... },
  "is_paddle_enabled": true,
  "prices": [
    {
      "id": "uuid",
      "provider": "paddle",
      "currency": "USD",
      "amount": 2,
      "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q7"
    }
  ]
}
```

**Response (Filtered by Interval and Country - `?interval=yearly&countryCode=BD`):**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "display_features": "Full access to all features",
  "features": { ... },
  "is_paddle_enabled": true,
  "prices": [
    {
      "id": "uuid",
      "provider": "paddle",
      "currency": "USD",
      "amount": 5,
      "paddle_price_id": "pri_01h1vjfevh5etwq3rb1cq1c1q8",
      "country_code": "BD"
    }
  ]
}
```

---

## Webhooks - Paddle

### Paddle Webhook Endpoint
**POST** `/webhooks/paddle`

**Authentication:** Signature Verification (HMAC-SHA256)

**Headers:**
- `paddle-signature`: Webhook signature for verification

**Request Body (Example - subscription.created):**
```json
{
  "event_id": "evt_01h1vjfevh5etwq3rb1cq1c1q7",
  "event_type": "subscription.created",
  "occurred_at": "2026-01-11T17:05:00Z",
  "data": {
    "id": "sub_01h1vjfevh5etwq3rb1cq1c1q7",
    "status": "active",
    "customer_id": "ctm_01h1vjfevh5etwq3rb1cq1c1q7",
    "currency_code": "USD",
    "started_at": "2026-01-11T17:05:00Z",
    "next_billed_at": "2026-02-11T17:05:00Z",
    "items": [
      {
        "price": {
          "id": "pri_01h1vjfevh5etwq3rb1cq1c1q7",
          "product_id": "pro_01h1vjes1y163xfj1rh1tkfb65"
        },
        "quantity": 1
      }
    ],
    "custom_data": {
      "user_id": "uuid",
      "plan_id": "uuid"
    }
  }
}
```

**Response:**
```json
{
  "received": true
}
```

**Supported Event Types:**
- `transaction.completed`
- `transaction.paid`
- `transaction.payment_failed`
- `subscription.created`
- `subscription.updated`
- `subscription.canceled`
- `subscription.paused`
- `subscription.resumed`
- `subscription.past_due`

---

## 🔐 Authentication

All admin endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

Public endpoints (`/pricing`) do not require authentication.

---

## 🌍 Environment Variables

Required environment variables:

```env
# Paddle Configuration
PADDLE_API_KEY=your_paddle_api_key
PADDLE_ENVIRONMENT=sandbox  # or 'production'
PADDLE_WEBHOOK_SECRET=your_webhook_secret
```

---

## 📝 Notes

1. **Paddle Synchronization**: When creating/updating plans, prices, or coupons with `provider: "paddle"`, the system automatically syncs with Paddle's API.

2. **Manual vs Paddle**:
   - **Manual**: Prices and coupons managed entirely in your database
   - **Paddle**: Prices and coupons synced with Paddle for payment processing

3. **Price Amounts**: 
   - Manual prices: Stored as decimal values (e.g., `9.99`)
   - Paddle prices: Converted to cents internally (e.g., `999`)

4. **Webhook Security**: All Paddle webhooks are verified using HMAC-SHA256 signature verification.

5. **Coupon Validation**: Use the `/admin/coupons/validate` endpoint to check if a coupon is valid before applying it.
