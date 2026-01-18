# Manual Plan Purchase Flow - Comprehensive Analysis

## 📋 Executive Summary

**Status: ✅ IMPLEMENTED & FUNCTIONAL**

The manual plan purchase system is fully implemented with a complete workflow from user request to admin verification. The system supports local payment methods (bKash, Nagad, Rocket) for Bangladesh users.

---

## 🏗️ System Architecture

### Database Tables

1. **`user_subscriptions`** - Active subscriptions
2. **`plan_orders`** - Subscription purchase requests/orders
3. **`payment_submissions`** - Payment proof submissions
4. **`plan_pricing`** - Price definitions (manual & Paddle)
5. **`user_subscription_plans`** - Plan definitions

### Key Components

- **Service**: `BillingLocalService` (`billing_local.service.ts`)
- **Controller**: `BillingLocalController` (`billing_local.controller.ts`)
- **Feature Access**: `FeatureAccessService` (validates plan limits)

---

## 🔄 Complete User Flow

### Phase 1: User Selects Plan & Creates Request
**Endpoint**: `POST /billing-local/requests`

**Request Body**:
```json
{
  "planId": "uuid",
  "duration": "monthly" | "yearly",
  "transactionId": "TXN123456",
  "provider": "bkash" | "nagad" | "rocket",
  "senderNumber": "01712345678",
  "note": "Optional note"
}
```

**What Happens**:
1. ✅ Validates plan exists
2. ✅ Fetches price from `plan_pricing` table (provider='manual')
3. ✅ Checks for existing pending requests (limit: 1 per user)
4. ✅ Creates order in `plan_orders` table
5. ✅ If `transactionId` provided, creates payment submission
6. ✅ Sets status to `pending_verification`

**Response**:
```json
{
  "id": "order-uuid",
  "user_id": "user-uuid",
  "plan_id": "plan-uuid",
  "status": "pending_verification",
  "amount_snapshot": 499,
  "duration_snapshot": 30,
  "created_at": "2026-01-18T10:00:00Z"
}
```

---

### Phase 2: Alternative - Submit Payment Later
**Endpoint**: `POST /billing-local/payments`

**Request Body**:
```json
{
  "requestId": "order-uuid",
  "transactionId": "TXN123456",
  "provider": "bkash",
  "senderNumber": "01712345678"
}
```

**What Happens**:
1. ✅ Validates order exists and belongs to user
2. ✅ Checks order is not already completed
3. ✅ Updates order status to `pending_verification`
4. ✅ Creates payment submission record
5. ✅ Preserves submission history (allows multiple attempts)

---

### Phase 3: User Checks Status
**Endpoint**: `GET /billing-local/status`

**Response**:
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

### Phase 4: Admin Reviews Submissions
**Endpoint**: `GET /billing-local/submissions/pending`

**Response**:
```json
[
  {
    "id": "submission-uuid",
    "user_id": "user-uuid",
    "transaction_id": "TXN123456",
    "provider": "bkash",
    "amount_snapshot": 499,
    "payment_date": "2026-01-18T10:00:00Z",
    "status": "submitted",
    "is_duplicate": false
  }
]
```

**Features**:
- ✅ Lists all pending submissions
- ✅ Flags duplicate transaction IDs across entire history
- ✅ Shows user info and payment details

---

### Phase 5: Admin Approves/Rejects
**Endpoint**: `POST /billing-local/submissions/:id/review`

**Request Body**:
```json
{
  "action": "approve" | "reject",
  "reason": "Optional verification notes"
}
```

#### On Approval:
1. ✅ Updates submission status to `verified`
2. ✅ Records admin ID and timestamp
3. ✅ Creates/updates active subscription
4. ✅ Calculates end_date (start + duration_snapshot days)
5. ✅ Updates order status to `completed`
6. ✅ User gains access to plan features immediately

#### On Rejection:
1. ✅ Updates submission status to `rejected`
2. ✅ Records rejection reason
3. ✅ Updates order status to `rejected`
4. ✅ User can submit new payment proof

---

### Phase 6: Automatic Expiry (Cron Job)
**Method**: `checkExpiries()`

**What Happens**:
1. ✅ Finds subscriptions past end_date
2. ✅ Marks them as `expired`
3. ✅ Automatically assigns Free plan
4. ✅ Creates new subscription with Free plan
5. ✅ Updates user's plan_id to Free

---

### Phase 7: Transaction History
**Endpoint**: `GET /billing-local/history?page=1&limit=10`

**Response**:
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
          "transaction_id": "TXN123456",
          "provider": "bkash",
          "status": "verified",
          "verification_notes": "Approved",
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

## 🔐 Feature Access Integration

The `FeatureAccessService` automatically validates plan limits:

```typescript
// Example: Check if user can create a category
await featureAccessService.checkLimit(userId, 'max_categories', currentCount + 1);
```

**How it works**:
1. ✅ Checks active subscription first
2. ✅ Falls back to user's direct plan assignment
3. ✅ Finally falls back to Free plan
4. ✅ Enforces limits (-1 = unlimited)
5. ✅ Throws `ForbiddenException` if limit exceeded

---

## 📊 Current Configuration

### Constants (`constants.ts`)
```typescript
MANUAL_SUBSCRIPTION_CONSTANTS = {
  PLAN_ID: 'premium-monthly',
  PLAN_PRICE: 499,
  PLAN_DURATION_DAYS: 30,
  CURRENCY: 'BDT',
  GRACE_PERIOD_DAYS: 3,
  PROVIDERS: ['bkash', 'nagad', 'rocket']
}
```

**⚠️ Note**: These constants are hardcoded but NOT used in the actual flow. The system correctly fetches prices from the `plan_pricing` table.

---

## ✅ What's Working

1. **Dynamic Pricing**: ✅ Fetches from database, not hardcoded
2. **Multiple Plans**: ✅ Supports any plan with manual prices
3. **Multiple Durations**: ✅ Monthly/Yearly based on `plan_pricing.interval`
4. **Payment Providers**: ✅ Accepts any provider (validation is lenient)
5. **Duplicate Detection**: ✅ Flags duplicate transaction IDs
6. **Submission History**: ✅ Preserves all payment attempts
7. **Auto-Expiry**: ✅ Cron-ready expiry system
8. **Feature Limits**: ✅ Enforced via FeatureAccessService
9. **Free Plan Fallback**: ✅ Auto-assigns on expiry

---

## ⚠️ Issues & Recommendations

### 🔴 Critical Issues

#### 1. **Public Pricing API Excludes Manual Prices**
**Location**: `pricing.service.ts` (lines 26-27, 135-136)

```typescript
// Current - ONLY shows Paddle prices
.where(and(
  eq(schema.planPricing.provider, 'paddle'),
  eq(schema.planPricing.is_active, true)
))
```

**Impact**: Users cannot see manual plan prices on the public pricing page.

**Fix Required**:
```typescript
// Option 1: Show both
.where(eq(schema.planPricing.is_active, true))

// Option 2: Filter by provider parameter
.where(and(
  provider ? eq(schema.planPricing.provider, provider) : undefined,
  eq(schema.planPricing.is_active, true)
))
```

#### 2. **Hardcoded Constants Not Used**
**Location**: `constants.ts`

The `MANUAL_SUBSCRIPTION_CONSTANTS` are defined but never used. The system correctly uses database values, but these constants are misleading.

**Recommendation**: Remove or document as legacy/example values.

#### 3. **Missing Cron Job**
**Location**: No cron implementation found

The `checkExpiries()` method exists but needs to be scheduled.

**Fix Required**: Add cron job (e.g., using `@nestjs/schedule`):
```typescript
@Cron('0 0 * * *') // Daily at midnight
async handleExpiries() {
  await this.billingLocalService.checkExpiries();
}
```

#### 4. **No User Plan Update on Approval**
**Location**: `billing_local.service.ts` (line 274-316)

When a subscription is approved, the `users.plan_id` is NOT updated. This means:
- ✅ Subscription is active
- ❌ User's direct plan reference is outdated

**Fix Required**: Add user update in approval flow:
```typescript
// After creating/updating subscription
await tx.update(users)
  .set({ plan_id: order.plan_id })
  .where(eq(users.id, order.user_id));
```

### 🟡 Medium Priority Issues

#### 5. **Provider Validation Commented Out**
**Location**: `billing_local.service.ts` (line 144-146)

```typescript
if (!MANUAL_SUBSCRIPTION_CONSTANTS.PROVIDERS.includes(dto.provider.toLowerCase() as any)) {
  // throw new BadRequestException('Invalid Provider');
}
```

**Recommendation**: Either enable validation or remove the check.

#### 6. **No Email Notifications**
Users and admins don't receive notifications for:
- Payment submission received
- Payment approved/rejected
- Subscription expiring soon

**Recommendation**: Add email service integration.

#### 7. **No Coupon Support**
The manual flow doesn't support applying coupons/discounts.

**Recommendation**: Add optional `couponCode` to `CreateSubscriptionRequestDto`.

### 🟢 Low Priority Enhancements

#### 8. **Grace Period Not Implemented**
`GRACE_PERIOD_DAYS: 3` is defined but not used in expiry logic.

#### 9. **No Refund Flow**
No mechanism to handle refunds or subscription cancellations.

#### 10. **Limited Admin Dashboard Data**
Missing endpoints for:
- Total revenue statistics
- Approval/rejection metrics
- Popular plans analytics

---

## 🧪 Testing Checklist

### User Flow Testing
- [ ] Create subscription request with transaction ID
- [ ] Create request without transaction ID, submit later
- [ ] Try creating multiple pending requests (should fail)
- [ ] Check status endpoint shows correct data
- [ ] View transaction history

### Admin Flow Testing
- [ ] List pending submissions
- [ ] Approve a submission
- [ ] Reject a submission
- [ ] Verify duplicate detection works
- [ ] Check subscription details endpoint

### Feature Access Testing
- [ ] Verify Free plan limits are enforced
- [ ] Verify Premium plan limits are enforced
- [ ] Test unlimited features (-1 value)
- [ ] Test subscription expiry reverts to Free plan

### Edge Cases
- [ ] Submit duplicate transaction ID
- [ ] Submit payment for completed order
- [ ] Submit payment for rejected order
- [ ] Approve already approved submission
- [ ] Check expiry with no Free plan defined

---

## 🚀 Quick Start Guide

### For Users:

1. **Get available plans**:
   ```bash
   GET /pricing
   ```
   ⚠️ Currently returns empty for manual plans - needs fix!

2. **Create subscription request**:
   ```bash
   POST /billing-local/requests
   {
     "planId": "plan-uuid",
     "duration": "monthly",
     "transactionId": "TXN123",
     "provider": "bkash",
     "senderNumber": "01712345678"
   }
   ```

3. **Check status**:
   ```bash
   GET /billing-local/status
   ```

### For Admins:

1. **View pending submissions**:
   ```bash
   GET /billing-local/submissions/pending
   ```

2. **Approve/Reject**:
   ```bash
   POST /billing-local/submissions/{id}/review
   {
     "action": "approve",
     "reason": "Payment verified"
   }
   ```

---

## 📝 Required Fixes Summary

### Must Fix (Before Production):
1. ✅ Update pricing API to show manual prices
2. ✅ Add user plan_id update on approval
3. ✅ Implement cron job for expiry checking
4. ✅ Add email notifications

### Should Fix (Soon):
5. Enable or remove provider validation
6. Add coupon support
7. Implement grace period logic

### Nice to Have:
8. Add refund flow
9. Add admin analytics endpoints
10. Add subscription cancellation

---

## 🎯 Conclusion

**The manual plan purchase system is well-architected and functional**, but requires a few critical fixes before production use:

1. **Public pricing visibility** - Users can't see manual plan prices
2. **User plan sync** - User's plan_id not updated on approval
3. **Automated expiry** - Needs cron job setup
4. **Notifications** - No email alerts

Once these are addressed, the system will be production-ready! 🚀
