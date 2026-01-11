# Payment System Implementation Plan

## Overview
Implement a comprehensive payment system supporting both **Manual** and **Paddle** payment methods with automated synchronization and lifecycle management.

## Phase 1: Database Schema ✅ (COMPLETED)

### Tables Created:
1. **`plan_pricing`** - Unified pricing for manual and Paddle
2. **`coupons`** - Discount codes for both providers
3. **`user_subscription_plans`** - Updated with Paddle fields
4. **`user_subscriptions`** - Updated with source tracking

### Migration Status:
- ✅ Schema files created
- ✅ Migration files generated (0021, 0022)
- ✅ Migrations applied to database

---

## Phase 2: Apply Database Migrations ✅ (COMPLETED)

Successfully applied migrations 0021 and 0022 to the database:
- ✅ Created `plan_pricing` table
- ✅ Created `coupons` table
- ✅ Added Paddle fields to `user_subscription_plans`
- ✅ Added source tracking to `user_subscriptions`

---

## Phase 3: Install Dependencies ✅ (COMPLETED)

Successfully installed:
- ✅ `@paddle/paddle-node-sdk` v3.5.0

---

## Phase 4: Paddle Service Implementation ✅ (COMPLETED)

Created comprehensive Paddle integration:
- ✅ `src/services/paddle.service.ts` - Paddle API wrapper
- ✅ `src/services/paddle.module.ts` - Paddle module
- ✅ `src/modules/webhooks/paddle-webhook.controller.ts` - Webhook endpoint
- ✅ `src/modules/webhooks/paddle-webhook.service.ts` - Webhook processor
- ✅ `src/modules/webhooks/webhooks.module.ts` - Webhooks module
- ✅ Updated `app.module.ts` to include new modules

**Features Implemented:**
- Product CRUD (create, update, archive)
- Price CRUD (create, update, archive)
- Discount CRUD (create, update, archive)
- Transaction creation and retrieval
- Subscription management (get, cancel, pause, resume)
- Customer management (create, get)
- Webhook signature verification
- Event processing for all subscription lifecycle events

---

## Phase 5: Admin Management APIs ✅ (COMPLETED)

**Created Services:**
- ✅ `src/modules/plans/services/plan-management.service.ts` - Plan CRUD with Paddle sync
- ✅ `src/modules/plans/services/price-management.service.ts` - Price CRUD with Paddle sync
- ✅ `src/modules/billing_local/services/coupon-management.service.ts` - Coupon CRUD with Paddle sync

**Created Controllers:**
- ✅ `src/modules/plans/controllers/plan-management.controller.ts`
- ✅ `src/modules/plans/controllers/price-management.controller.ts`
- ✅ `src/modules/billing_local/controllers/coupon-management.controller.ts`

**Created DTOs:**
- ✅ `src/modules/plans/dto/plan-management.dto.ts`
- ✅ `src/modules/plans/dto/price-management.dto.ts`
- ✅ `src/modules/billing_local/dto/coupon-management.dto.ts`

**API Endpoints:**
- ✅ Plan Management: POST, GET, PUT, DELETE `/admin/plans`
- ✅ Price Management: POST, GET, PUT, DELETE `/admin/prices`
- ✅ Coupon Management: POST, GET, PUT, DELETE `/admin/coupons`
- ✅ Coupon Validation: POST `/admin/coupons/validate`

---

## Phase 6: Public Pricing API ✅ (COMPLETED)

**Created Services:**
- ✅ `src/modules/plans/services/pricing.service.ts` - Public pricing aggregation

**Created Controllers:**
- ✅ `src/modules/plans/controllers/pricing.controller.ts`

**API Endpoints:**
- ✅ GET `/pricing` - Returns all plans with unified pricing
- ✅ GET `/pricing/:planId` - Returns specific plan pricing

**Response Format:**
```json
{
  "id": "uuid",
  "name": "Premium Plan",
  "plan_key": "premium",
  "features": {...},
  "is_paddle_enabled": true,
  "prices": {
    "monthly": [
      { "provider": "manual", "currency": "USD", "amount": 9.99 },
      { "provider": "paddle", "paddle_price_id": "pri_xxx" }
    ],
    "yearly": [...]
  }
}
```

---

## Phase 7: Payment Execution ⏳ (NEXT)

### 7.1 Manual Payment Flow
1. User selects plan + optional coupon
2. `POST /payments/manual/checkout` - Creates order
3. Admin marks as paid: `POST /admin/orders/:id/confirm`
4. System creates subscription

### 7.2 Paddle Payment Flow
1. User selects plan
2. `POST /payments/paddle/checkout` - Creates Paddle transaction
3. Returns checkout URL
4. Paddle webhook confirms payment
5. System creates subscription

---

## Phase 8: Webhook Handler

### File: `src/modules/webhooks/paddle.controller.ts`

Handle Paddle events:
- `transaction.completed` → Create subscription
- `subscription.updated` → Update subscription
- `subscription.canceled` → Cancel subscription
- `transaction.payment_failed` → Handle dunning

---

## Phase 9: Lifecycle Management

### 9.1 Manual Subscriptions
- Cron job checks expiry daily
- Downgrades expired subscriptions

### 9.2 Paddle Subscriptions
- Webhook-driven updates
- Automatic renewal handling
- Payment failure → Downgrade

---

## Phase 10: Testing & Validation

1. Test manual payment flow end-to-end
2. Test Paddle sandbox integration
3. Test webhook handling
4. Test subscription lifecycle
5. Test coupon application

---

## Current Status: Phase 2 (Apply Migrations)

**Next Action**: Apply database migrations manually using psql commands above.
