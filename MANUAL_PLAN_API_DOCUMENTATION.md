# Manual Plan Purchase System - Complete API Documentation

## 🎯 Overview

This document provides complete API documentation for the manual plan purchase system, including all recent improvements:

✅ New pricing API for manual + paddle prices  
✅ User plan synchronization on approval  
✅ Automated subscription expiry (cron job)  
✅ Email notifications (ready for integration)

---

## 📍 API Endpoints

### 1. Pricing APIs

#### GET `/pricing` - Paddle-Only Pricing (Existing)
Get public pricing for all plans (Paddle prices only).

**Query Parameters:**
- `interval` (optional): `monthly` | `yearly` | `one-time`
- `countryCode` (optional): Two-letter country code (e.g., `BD`, `US`, `GB`)

**Response:**
```json
[
  {
    "id": "plan-uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access to all features",
    "features": {
      "max_categories": 50,
      "max_budgets": 20,
      "max_transactions": -1,
      "is_premium": true
    },
    "is_paddle_enabled": true,
    "prices": {
      "monthly": [
        {
          "id": "price-uuid",
          "provider": "paddle",
          "currency": "USD",
          "amount": 9.99,
          "paddle_price_id": "pri_xxx"
        }
      ]
    }
  }
]
```

---

#### GET `/pricing/all` - All Pricing (NEW ✨)
Get public pricing for all plans (Manual + Paddle prices).

**Query Parameters:**
- `interval` (optional): `monthly` | `yearly` | `one-time`
- `countryCode` (optional): Two-letter country code

**Response:**
```json
[
  {
    "id": "plan-uuid",
    "name": "Premium Plan",
    "plan_key": "premium",
    "display_features": "Full access",
    "features": { ... },
    "is_paddle_enabled": true,
    "prices": {
      "monthly": [
        {
          "id": "price-uuid-1",
          "provider": "manual",
          "currency": "BDT",
          "amount": 499,
          "paddle_price_id": null
        },
        {
          "id": "price-uuid-2",
          "provider": "paddle",
          "currency": "USD",
          "amount": 9.99,
          "paddle_price_id": "pri_xxx"
        }
      ],
      "yearly": [
        {
          "id": "price-uuid-3",
          "provider": "manual",
          "currency": "BDT",
          "amount": 4990,
          "paddle_price_id": null
        }
      ]
    }
  }
]
```

---

#### GET `/pricing/all/:planId` - Plan-Specific All Pricing (NEW ✨)
Get pricing for a specific plan (Manual + Paddle).

**Path Parameters:**
- `planId`: UUID of the plan

**Query Parameters:**
- `interval` (optional): Filter by interval
- `countryCode` (optional): Get country-specific pricing

**Response:** Same structure as above, but for single plan

---

### 2. Manual Billing - User Endpoints

#### POST `/billing-local/requests` - Create Subscription Request
User creates a subscription purchase request.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "planId": "plan-uuid",
  "duration": "monthly",
  "transactionId": "TXN123456789",
  "provider": "bkash",
  "senderNumber": "01712345678",
  "note": "Optional payment note",
  "couponCode": "SAVE20"
}
```

**Field Descriptions:**
- `planId` (required): UUID of the plan to subscribe to
- `duration` (required): `monthly` | `yearly`
- `transactionId` (required): Payment transaction ID from bKash/Nagad/Rocket
- `provider` (required): Payment provider (`bkash`, `nagad`, `rocket`)
- `senderNumber` (optional): Sender's mobile number
- `note` (optional): Additional notes
- `couponCode` (optional): Coupon code to apply discount (NEW ✨)

**Coupon Support (NEW ✨):**
- Only manual coupons (`provider: "manual"`) can be applied
- Coupon code is case-insensitive
- Validates expiry date and usage limits
- Supports three discount types:
  - `percentage`: Percentage off (e.g., 20% off)
  - `flat`: Fixed amount off (e.g., 100 BDT off)
  - `flat_per_seat`: Fixed amount per unit (treated as flat for manual plans)
- Currency must match for flat discounts
- Final price cannot be negative (minimum 0)
- Coupon usage count increments on successful application

**Response:**
```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "plan_id": "plan-uuid",
  "status": "pending_verification",
  "amount_snapshot": 399,
  "duration_snapshot": 30,
  "created_at": "2026-01-18T10:00:00Z",
  "updated_at": "2026-01-18T10:00:00Z"
}
```

**Note:** The `amount_snapshot` reflects the discounted price if a coupon was applied (e.g., 499 - 100 = 399).

**Email Sent:** ✅ Payment submission confirmation to user

---

#### POST `/billing-local/coupons/validate` - Validate Coupon (NEW ✨)
Check if a coupon is valid and calculate the discount before creating a subscription request.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "couponCode": "SAVE20",
  "planId": "plan-uuid",
  "duration": "monthly"
}
```

**Field Descriptions:**
- `couponCode` (required): Coupon code to validate
- `planId` (required): UUID of the plan
- `duration` (required): `monthly` | `yearly`

**Response (Valid Coupon):**
```json
{
  "valid": true,
  "coupon": {
    "code": "SAVE20",
    "discount_type": "percentage",
    "discount_amount": "20",
    "description": "20% off monthly plans"
  },
  "pricing": {
    "original_price": 499,
    "discount_amount": 99.8,
    "final_price": 399.2,
    "currency": "BDT",
    "savings_percentage": 20
  },
  "plan": {
    "id": "plan-uuid",
    "name": "Premium Plan",
    "duration": "monthly"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or inactive coupon code
- `400 Bad Request` - Coupon has expired
- `400 Bad Request` - Coupon usage limit reached
- `400 Bad Request` - Coupon currency mismatch
- `404 Not Found` - Plan not found

**Use Case:**
Call this endpoint when the user enters a coupon code to show them the discount in real-time before they submit their payment.

---

#### POST `/billing-local/payments` - Submit Payment
Submit payment for an existing draft order.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "requestId": "order-uuid",
  "transactionId": "TXN123456789",
  "provider": "bkash",
  "senderNumber": "01712345678"
}
```

**Response:**
```json
{
  "success": true
}
```

**Email Sent:** ✅ Payment submission confirmation to user

---

#### GET `/billing-local/status` - Get Subscription Status
Check current subscription and pending requests.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "current": {
    "status": "active",
    "start_date": "2026-01-01T00:00:00Z",
    "end_date": "2026-01-31T00:00:00Z",
    "plan_id": "plan-uuid"
  },
  "pending": {
    "status": "pending_verification",
    "created_at": "2026-01-18T10:00:00Z",
    "amount": 499,
    "plan_id": "plan-uuid"
  }
}
```

---

#### GET `/billing-local/history` - Transaction History
Get user's transaction history with pagination.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page

**Response:**
```json
{
  "data": [
    {
      "id": "order-uuid",
      "status": "completed",
      "amount": 499,
      "duration": 30,
      "created_at": "2026-01-18T10:00:00Z",
      "plan_name": "Premium Plan",
      "submissions": [
        {
          "id": "submission-uuid",
          "transaction_id": "TXN123456789",
          "provider": "bkash",
          "status": "verified",
          "verification_notes": "Payment verified",
          "created_at": "2026-01-18T10:00:00Z"
        }
      ]
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### 3. Manual Billing - Admin Endpoints

#### GET `/billing-local/submissions/pending` - List Pending Submissions
Get all pending payment submissions for review.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
[
  {
    "id": "submission-uuid",
    "user_id": "user-uuid",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "transaction_id": "TXN123456789",
    "provider": "bkash",
    "amount_snapshot": 499,
    "payment_date": "2026-01-18T10:00:00Z",
    "status": "submitted",
    "is_duplicate": false
  }
]
```

**Features:**
- ✅ Automatically flags duplicate transaction IDs
- ✅ Shows all submissions awaiting review

---

#### GET `/billing-local/requests/:id` - Get Request Details
Get detailed information about a subscription request.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Path Parameters:**
- `id`: Order UUID

**Response:**
```json
{
  "id": "order-uuid",
  "status": "pending_verification",
  "amount": 499,
  "duration": 30,
  "created_at": "2026-01-18T10:00:00Z",
  "updated_at": "2026-01-18T10:00:00Z",
  "user": {
    "id": "user-uuid",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "plan": {
    "id": "plan-uuid",
    "name": "Premium Plan"
  },
  "submissions": [
    {
      "id": "submission-uuid",
      "transaction_id": "TXN123456789",
      "provider": "bkash",
      "sender_number": "01712345678",
      "status": "submitted",
      "created_at": "2026-01-18T10:00:00Z"
    }
  ]
}
```

---

#### POST `/billing-local/submissions/:id/review` - Approve/Reject Payment
Admin reviews and approves or rejects a payment submission.

**Headers:**
```
Authorization: Bearer <admin_jwt_token>
```

**Path Parameters:**
- `id`: Submission UUID

**Request Body:**
```json
{
  "action": "approve",
  "reason": "Payment verified successfully"
}
```

**Field Descriptions:**
- `action` (required): `approve` | `reject`
- `reason` (optional): Verification notes or rejection reason

**Response (Approval):**
```json
{
  "success": true,
  "status": "active",
  "endDate": "2026-02-18T10:00:00Z"
}
```

**Response (Rejection):**
```json
{
  "success": true,
  "status": "rejected"
}
```

**What Happens on Approval:**
1. ✅ Subscription created/updated with calculated end date
2. ✅ Order marked as completed
3. ✅ User's `plan_id` updated (NEW ✨)
4. ✅ Email sent to user (NEW ✨)

**What Happens on Rejection:**
1. ✅ Submission marked as rejected
2. ✅ Order marked as rejected
3. ✅ Email sent to user with reason (NEW ✨)

---

## 🔄 Automated Processes

### Subscription Expiry Cron Job (NEW ✨)

**Schedule:** Daily at midnight (00:00)

**What it does:**
1. Finds all active subscriptions past their end date
2. Marks them as expired
3. Automatically assigns Free plan to users
4. Creates new subscription record with Free plan
5. Updates user's plan_id

**Manual Trigger (for testing):**
```typescript
// Call from admin endpoint or CLI
await billingLocalService.checkExpiries();
```

**Response:**
```json
{
  "expiredCount": 5
}
```

---

## 📧 Email Notifications (NEW ✨)

### Notification Types

#### 1. Payment Submitted
**Trigger:** User submits payment  
**Recipient:** User  
**Template:** `payment-submitted`  
**Data:**
```json
{
  "userName": "John Doe",
  "planName": "Premium Plan",
  "amount": 499,
  "transactionId": "TXN123456789"
}
```

#### 2. Payment Approved
**Trigger:** Admin approves payment  
**Recipient:** User  
**Template:** `payment-approved`  
**Data:**
```json
{
  "userName": "John Doe",
  "planName": "Premium Plan",
  "expiryDate": "2026-02-18T10:00:00Z"
}
```

#### 3. Payment Rejected
**Trigger:** Admin rejects payment  
**Recipient:** User  
**Template:** `payment-rejected`  
**Data:**
```json
{
  "userName": "John Doe",
  "planName": "Premium Plan",
  "reason": "Invalid transaction ID"
}
```

#### 4. Subscription Expiring (Future)
**Trigger:** Subscription expiring in X days  
**Recipient:** User  
**Template:** `subscription-expiring`  
**Data:**
```json
{
  "userName": "John Doe",
  "planName": "Premium Plan",
  "expiryDate": "2026-02-18T10:00:00Z",
  "daysRemaining": 3
}
```

### Email Service Integration

The email service is ready for integration with:
- SendGrid
- AWS SES
- Mailgun
- Any SMTP provider

**Location:** `/src/modules/billing_local/services/email-notification.service.ts`

**TODO:** Update `sendEmail()` method with actual email provider integration.

---

## 🔐 Authentication & Authorization

### User Endpoints
**Required:** JWT token with `User` or `SuperAdmin` role

### Admin Endpoints
**Required:** JWT token with `SuperAdmin` role

**Header Format:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 Status Values

### Order Status
- `draft` - Order created but no payment submitted
- `pending_verification` - Payment submitted, awaiting admin review
- `rejected` - Payment rejected by admin
- `completed` - Payment approved, subscription active

### Payment Submission Status
- `submitted` - Payment proof submitted
- `verified` - Approved by admin
- `rejected` - Rejected by admin

### Subscription Status
- `active` - Subscription is active
- `expired` - Subscription has expired

---

## 🎯 Complete User Flow Example

### Step 1: User Browses Plans
```http
GET /pricing/all?interval=monthly&countryCode=BD
```

### Step 2: User Validates Coupon (Optional)
```http
POST /billing-local/coupons/validate
{
  "couponCode": "SAVE20",
  "planId": "plan-uuid",
  "duration": "monthly"
}
```
✅ Response shows discount: 499 BDT → 399.2 BDT (20% off)

### Step 3: User Creates Subscription Request (with Coupon)
```http
POST /billing-local/requests
{
  "planId": "plan-uuid",
  "duration": "monthly",
  "transactionId": "TXN123456789",
  "provider": "bkash",
  "senderNumber": "01712345678",
  "couponCode": "SAVE20"
}
```
📧 Email sent: Payment submission confirmation

### Step 4: User Checks Status
```http
GET /billing-local/status
```

### Step 5: Admin Reviews Submission
```http
GET /billing-local/submissions/pending
```

### Step 6: Admin Approves Payment
```http
POST /billing-local/submissions/{id}/review
{
  "action": "approve",
  "reason": "Payment verified"
}
```
📧 Email sent: Payment approved, subscription activated

### Step 7: User Accesses Premium Features
User now has access to premium features based on plan limits.

### Step 8: Subscription Expires (30 days later)
🤖 Cron job automatically:
- Marks subscription as expired
- Assigns Free plan
- User reverts to Free plan limits

---

## 🚀 Quick Start for Developers

### 1. Install Dependencies
```bash
npm install @nestjs/schedule
```

### 2. Test New Pricing API
```bash
# Get all pricing (manual + paddle)
curl http://localhost:3000/pricing/all

# Get specific plan pricing
curl http://localhost:3000/pricing/all/{planId}?interval=monthly
```

### 3. Test Manual Flow (with Coupon)
```bash
# Create subscription request with coupon
curl -X POST http://localhost:3000/billing-local/requests \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "plan-uuid",
    "duration": "monthly",
    "transactionId": "TEST123",
    "provider": "bkash",
    "couponCode": "SAVE20"
  }'

# Check status
curl http://localhost:3000/billing-local/status \
  -H "Authorization: Bearer <token>"
```

### 4. Test Admin Approval
```bash
# Get pending submissions
curl http://localhost:3000/billing-local/submissions/pending \
  -H "Authorization: Bearer <admin_token>"

# Approve submission
curl -X POST http://localhost:3000/billing-local/submissions/{id}/review \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "reason": "Verified"
  }'
```

---

## 📝 Database Schema

### Tables Used

1. **user_subscription_plans** - Plan definitions
2. **plan_pricing** - Price definitions (manual & paddle)
3. **plan_orders** - Subscription purchase requests
4. **payment_submissions** - Payment proof submissions
5. **user_subscriptions** - Active subscriptions
6. **users** - User records (plan_id updated on approval)

---

## ✅ Implementation Checklist

- [x] New pricing API endpoints (`/pricing/all`)
- [x] User plan synchronization on approval
- [x] Automated expiry cron job
- [x] Email notification service
- [x] Email integration in payment flow
- [x] Coupon support for manual payments (NEW ✨)
- [ ] Email provider configuration (SendGrid/AWS SES)
- [ ] Subscription expiring reminder (7 days before)
- [ ] Admin dashboard analytics endpoints

---

## 🐛 Known Issues & Future Enhancements

### To Fix:
1. Configure actual email provider (currently logs only)
2. Add subscription expiring reminder (7 days before expiry)
3. Add admin analytics endpoints

### Future Enhancements:
1. Refund flow for manual payments
2. Grace period implementation
3. Payment gateway integration (bKash API)
4. Recurring coupon support (apply discount to multiple billing cycles)

---

## 📞 Support

For issues or questions:
1. Check logs in `/logs` directory
2. Review error messages in API responses
3. Contact development team

---

**Last Updated:** 2026-01-18  
**Version:** 2.2.0  
**Status:** ✅ Production Ready (pending email provider configuration)
