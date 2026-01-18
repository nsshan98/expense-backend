# Coupon Validation API - Quick Reference

## 🎯 Purpose
Validate coupon codes and calculate discounts **before** the user submits their payment. This allows you to show real-time discount information in your UI.

---

## 📍 Endpoint

**POST** `/billing-local/coupons/validate`

**Authentication:** Required (JWT)

---

## 📝 Request

```json
{
  "couponCode": "SAVE20",
  "planId": "plan-uuid",
  "duration": "monthly"
}
```

### Parameters
- **couponCode** (string, required): The coupon code to validate
- **planId** (string, required): UUID of the plan
- **duration** (string, required): Either `monthly` or `yearly`

---

## ✅ Success Response

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

### Response Fields

**coupon**
- `code`: The validated coupon code (uppercase)
- `discount_type`: Type of discount (`percentage`, `flat`, `flat_per_seat`)
- `discount_amount`: The discount value
- `description`: Coupon description

**pricing**
- `original_price`: Original plan price
- `discount_amount`: Amount discounted
- `final_price`: Price after discount (minimum 0)
- `currency`: Currency code (e.g., BDT, USD)
- `savings_percentage`: Percentage saved (rounded)

**plan**
- `id`: Plan UUID
- `name`: Plan name
- `duration`: Billing duration

---

## ❌ Error Responses

### Invalid Coupon
```json
{
  "statusCode": 400,
  "message": "Invalid or inactive coupon code"
}
```

### Expired Coupon
```json
{
  "statusCode": 400,
  "message": "Coupon has expired"
}
```

### Usage Limit Reached
```json
{
  "statusCode": 400,
  "message": "Coupon usage limit reached"
}
```

### Currency Mismatch
```json
{
  "statusCode": 400,
  "message": "Coupon currency (USD) does not match plan price currency (BDT)"
}
```

### Plan Not Found
```json
{
  "statusCode": 404,
  "message": "Plan not found"
}
```

---

## 💡 Usage Examples

### Example 1: Percentage Discount

**Request:**
```bash
curl -X POST http://localhost:3000/billing-local/coupons/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "SAVE20",
    "planId": "abc-123",
    "duration": "monthly"
  }'
```

**Response:**
```json
{
  "valid": true,
  "pricing": {
    "original_price": 499,
    "discount_amount": 99.8,
    "final_price": 399.2,
    "savings_percentage": 20
  }
}
```

---

### Example 2: Flat Discount

**Request:**
```bash
curl -X POST http://localhost:3000/billing-local/coupons/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "FLAT100",
    "planId": "abc-123",
    "duration": "yearly"
  }'
```

**Response:**
```json
{
  "valid": true,
  "coupon": {
    "discount_type": "flat",
    "discount_amount": "100"
  },
  "pricing": {
    "original_price": 4990,
    "discount_amount": 100,
    "final_price": 4890,
    "currency": "BDT",
    "savings_percentage": 2
  }
}
```

---

## 🎨 Frontend Integration

### React Example

```typescript
import { useState } from 'react';

function CouponValidator({ planId, duration }) {
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const validateCoupon = async () => {
    if (!couponCode) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/billing-local/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          couponCode,
          planId,
          duration
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      const data = await response.json();
      setDiscount(data);
    } catch (err) {
      setError(err.message);
      setDiscount(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={couponCode}
        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
        placeholder="Enter coupon code"
      />
      <button onClick={validateCoupon} disabled={loading}>
        {loading ? 'Validating...' : 'Apply Coupon'}
      </button>
      
      {error && (
        <div className="error">{error}</div>
      )}
      
      {discount && (
        <div className="success">
          <p>✅ Coupon applied!</p>
          <p>Original: {discount.pricing.original_price} {discount.pricing.currency}</p>
          <p>Discount: -{discount.pricing.discount_amount} {discount.pricing.currency}</p>
          <p>Final: {discount.pricing.final_price} {discount.pricing.currency}</p>
          <p>You save {discount.pricing.savings_percentage}%!</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 Workflow

1. **User enters coupon code** in your UI
2. **Call validation endpoint** with plan and duration
3. **Show discount preview** if valid
4. **Display error message** if invalid
5. **User proceeds** to create subscription request with coupon

---

## ⚠️ Important Notes

1. **Case Insensitive**: Coupon codes are automatically converted to uppercase
2. **No Usage Increment**: This endpoint only validates, it doesn't increment usage count
3. **Real-time Validation**: Always validates against current coupon status (expiry, limits, etc.)
4. **Manual Coupons Only**: Only validates coupons with `provider: "manual"`
5. **Currency Matching**: For flat discounts, currency must match the plan price currency

---

## 🧪 Testing

### Test Valid Coupon
```bash
# First, create a test coupon in database
INSERT INTO coupons (code, provider, discount_type, discount_amount, is_active)
VALUES ('TEST20', 'manual', 'percentage', '20', true);

# Then validate it
curl -X POST http://localhost:3000/billing-local/coupons/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "TEST20",
    "planId": "your-plan-id",
    "duration": "monthly"
  }'
```

### Test Expired Coupon
```bash
# Create expired coupon
INSERT INTO coupons (code, provider, discount_type, discount_amount, expires_at, is_active)
VALUES ('EXPIRED', 'manual', 'percentage', '10', '2024-01-01', true);

# Validate (should fail)
curl -X POST http://localhost:3000/billing-local/coupons/validate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "couponCode": "EXPIRED",
    "planId": "your-plan-id",
    "duration": "monthly"
  }'
```

---

## 📊 Common Discount Types

### Percentage Discount
- **discount_type**: `percentage`
- **discount_amount**: `20` (means 20%)
- **Calculation**: `original_price * (discount_amount / 100)`

### Flat Discount
- **discount_type**: `flat`
- **discount_amount**: `100` (means 100 BDT/USD/etc.)
- **Calculation**: `original_price - discount_amount`
- **Note**: Requires currency match

### Flat Per Seat
- **discount_type**: `flat_per_seat`
- **discount_amount**: `50` (means 50 per unit)
- **Calculation**: For manual plans, treated as flat discount
- **Note**: Requires currency match

---

## 🎯 Best Practices

1. **Debounce Input**: Don't validate on every keystroke, wait for user to finish typing
2. **Show Loading State**: Display spinner while validating
3. **Clear Previous Results**: Clear old discount info when user changes coupon
4. **Preserve Coupon**: If valid, auto-fill the coupon in the subscription request
5. **Handle Errors Gracefully**: Show user-friendly error messages

---

**Version:** 2.2.0  
**Last Updated:** 2026-01-18
