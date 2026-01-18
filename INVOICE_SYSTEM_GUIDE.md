# Invoice Download System - Complete Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [API Endpoints](#api-endpoints)
3. [Testing in Postman](#testing-in-postman)
4. [Frontend Integration](#frontend-integration)
5. [Troubleshooting](#troubleshooting)

---

## System Overview

This system allows users to download/view invoices for both manual and Paddle transactions.

### Features
- ✅ Download invoices as PDF (manual transactions)
- ✅ Get invoice URLs from Paddle (Paddle transactions)
- ✅ View invoices inline or download
- ✅ Check invoice availability
- ✅ Secure (JWT authentication + ownership validation)

### How It Works

**Manual Invoices:**
```
User Request → Controller → Service → Generate PDF → Stream to User
```

**Paddle Invoices:**
```
User Request → Controller → Service → Paddle SDK → Get URL → Return to User
```

---

## API Endpoints

### 1. Download Manual Invoice

**Endpoint:** `GET /billing-local/invoices/manual/:orderId`

**Query Parameters:**
- `disposition` (optional): `attachment` (default) or `inline`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:** PDF file (application/pdf)

**Example:**
```bash
GET http://localhost:5000/billing-local/invoices/manual/abc123?disposition=attachment
```

---

### 2. Get Paddle Invoice URL

**Endpoint:** `GET /billing-local/invoices/paddle/:eventId`

**Query Parameters:**
- `disposition` (optional): `attachment` (default) or `inline`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "url": "https://sandbox-invoices.paddle.com/...",
  "expiresIn": "1 hour",
  "message": "Invoice URL retrieved successfully. This URL expires in 1 hour."
}
```

**Example:**
```bash
GET http://localhost:5000/billing-local/invoices/paddle/evt_123?disposition=attachment
```

---

### 3. Check Invoice Availability

**Endpoint:** `GET /billing-local/invoices/check/:source/:transactionId`

**Parameters:**
- `source`: `manual` or `paddle`
- `transactionId`: Order ID (manual) or Event ID (paddle)

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "available": true
}
```

or

```json
{
  "available": false,
  "reason": "Invoice only available for completed orders"
}
```

---

## Testing in Postman

### Step 1: Login and Get Token

**Request:**
```
POST http://localhost:5000/auth/login
Content-Type: application/json

Body:
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**📋 Copy the `access_token` - you'll need it for all requests!**

---

### Step 2: Find Transaction IDs

Run these SQL queries to find IDs:

**For Manual Invoices:**
```sql
SELECT 
  id as order_id,
  status,
  amount_snapshot,
  created_at
FROM plan_orders
WHERE status = 'completed'
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**For Paddle Invoices:**
```sql
SELECT 
  id as event_id,
  paddle_txn_id,
  status,
  amount
FROM user_payment_events
WHERE status = 'completed'
  AND paddle_txn_id IS NOT NULL
  AND user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
```

---

### Step 3: Test Manual Invoice Download

**Request in Postman:**

1. **Method:** GET
2. **URL:** `http://localhost:5000/billing-local/invoices/manual/YOUR_ORDER_ID?disposition=attachment`
3. **Headers:**
   - Key: `Authorization`
   - Value: `Bearer YOUR_ACCESS_TOKEN`
4. Click **Send**

**Save the PDF:**
1. Click **Save Response** dropdown
2. Select **Save to a file**
3. Save as `invoice.pdf`
4. Open and verify the PDF

**Expected Response:**
- Status: `200 OK`
- Content-Type: `application/pdf`
- Body: Binary PDF data

---

### Step 4: Test Paddle Invoice URL

**Request in Postman:**

1. **Method:** GET
2. **URL:** `http://localhost:5000/billing-local/invoices/paddle/YOUR_EVENT_ID?disposition=attachment`
3. **Headers:**
   - Key: `Authorization`
   - Value: `Bearer YOUR_ACCESS_TOKEN`
4. Click **Send**

**Expected Response:**
```json
{
  "url": "https://sandbox-invoices.paddle.com/...",
  "expiresIn": "1 hour",
  "message": "Invoice URL retrieved successfully. This URL expires in 1 hour."
}
```

**Open the Invoice:**
- Copy the `url` from the response
- Paste it in your browser
- The Paddle invoice PDF will open

---

### Step 5: Test Availability Check

**Request in Postman:**

1. **Method:** GET
2. **URL:** `http://localhost:5000/billing-local/invoices/check/manual/YOUR_ORDER_ID`
3. **Headers:**
   - Key: `Authorization`
   - Value: `Bearer YOUR_ACCESS_TOKEN`
4. Click **Send**

**Expected Response:**
```json
{
  "available": true
}
```

---

### Common Test Cases

#### Test 1: Invalid Order ID
```
GET /billing-local/invoices/manual/invalid-id
Expected: 404 Not Found
```

#### Test 2: No Authorization
```
GET /billing-local/invoices/manual/ORDER_ID
(No Authorization header)
Expected: 401 Unauthorized
```

#### Test 3: Pending Order
```
GET /billing-local/invoices/manual/PENDING_ORDER_ID
Expected: 400 Bad Request
Message: "Invoice is only available for completed orders"
```

#### Test 4: Wrong User's Order
```
Login as User A, try to access User B's order
Expected: 400 Bad Request
Message: "You do not have permission to access this invoice"
```

---

## Frontend Integration

### React Hook Example

```typescript
// hooks/useInvoice.ts
import { useState } from 'react';

export function useInvoice() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadInvoice = async (
    transactionId: string,
    source: 'manual' | 'paddle',
    disposition: 'attachment' | 'inline' = 'attachment'
  ) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token'); // or your auth method
      const endpoint = source === 'manual'
        ? `/billing-local/invoices/manual/${transactionId}`
        : `/billing-local/invoices/paddle/${transactionId}`;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${endpoint}?disposition=${disposition}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch invoice');
      }

      if (source === 'manual') {
        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        if (disposition === 'inline') {
          window.open(url, '_blank');
        } else {
          const a = document.createElement('a');
          a.href = url;
          a.download = `invoice-${transactionId}.pdf`;
          a.click();
        }

        window.URL.revokeObjectURL(url);
      } else {
        // Handle Paddle URL
        const data = await response.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { downloadInvoice, loading, error };
}
```

### Component Example

```tsx
// components/TransactionHistory.tsx
import { useInvoice } from '@/hooks/useInvoice';

export function TransactionHistory({ transactions }) {
  const { downloadInvoice, loading } = useInvoice();

  const handleDownload = async (transaction) => {
    try {
      await downloadInvoice(
        transaction.id,
        transaction.source, // 'manual' or 'paddle'
        'attachment'
      );
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleView = async (transaction) => {
    try {
      await downloadInvoice(
        transaction.id,
        transaction.source,
        'inline'
      );
    } catch (error) {
      console.error('View failed:', error);
    }
  };

  return (
    <div>
      {transactions.map((transaction) => (
        <div key={transaction.id}>
          <h3>{transaction.description}</h3>
          <p>Amount: {transaction.amount}</p>
          <p>Status: {transaction.status}</p>

          {transaction.status === 'completed' && (
            <div className="flex gap-2">
              <button
                onClick={() => handleDownload(transaction)}
                disabled={loading}
              >
                Download Invoice
              </button>
              <button
                onClick={() => handleView(transaction)}
                disabled={loading}
              >
                View Invoice
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Troubleshooting

### Problem: "Unauthorized" (401)
**Cause:** Missing or invalid JWT token

**Solution:**
- Verify Authorization header is present
- Check format: `Bearer YOUR_TOKEN` (with space after Bearer)
- Token might be expired - login again

---

### Problem: "Order not found" (404)
**Cause:** Invalid order/event ID

**Solution:**
- Verify ID exists in database
- Check you're using the correct ID
- Ensure ID belongs to authenticated user

---

### Problem: "Invoice only available for completed orders" (400)
**Cause:** Order status is not 'completed'

**Solution:**
- Check order status in database
- Only completed transactions have invoices
- Wait for order to be completed

---

### Problem: "You do not have permission to access this invoice" (400)
**Cause:** Trying to access another user's invoice

**Solution:**
- Verify you're using the correct user's token
- Check order belongs to authenticated user

---

### Problem: PDF is corrupted or won't open
**Cause:** PDF generation error or incomplete download

**Solution:**
- Check server logs for PDF generation errors
- Verify all required data exists (user name, plan name, etc.)
- Try downloading again
- Test with different order

---

### Problem: Paddle invoice URL doesn't work
**Cause:** URL expired or Paddle API error

**Solution:**
- URLs expire in 1 hour - get a new one
- Check Paddle API credentials in `.env`
- Verify `PADDLE_API_KEY` and `PADDLE_ENVIRONMENT` are set
- Check server logs for Paddle API errors

---

### Problem: Can't see PDF in Postman
**This is normal!** Postman shows binary data for PDFs.

**Solution:**
1. Click "Save Response"
2. Select "Save to a file"
3. Save as `.pdf`
4. Open with PDF viewer

---

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Paddle Configuration
PADDLE_API_KEY=your_paddle_api_key_here
PADDLE_ENVIRONMENT=sandbox  # or 'production'

# Database
DATABASE_URL=your_database_url

# JWT
JWT_SECRET=your_jwt_secret
```

---

## Database Requirements

### For Manual Invoices:
- Order must exist in `plan_orders` table
- Order status must be `completed`
- Related data must exist:
  - User in `users` table
  - Plan in `subscription_plans` table
  - Payment submission in `payment_submissions` table

### For Paddle Invoices:
- Event must exist in `user_payment_events` table
- Event status must be `completed`
- `paddle_txn_id` must not be NULL

---

## Invoice PDF Contents

Manual invoices include:

```
┌─────────────────────────────────────────┐
│              INVOICE                     │
│         Invoice #: INV-ABC123           │
│         Date: January 18, 2026          │
│                                          │
│  Your Company Name                      │
│  support@yourcompany.com                │
│                                          │
│  Bill To:                               │
│  John Doe                               │
│  john@example.com                       │
│                                          │
│  ────────────────────────────────────  │
│                                          │
│  Description    Duration    Amount      │
│  Premium Plan   365 days    BDT 9900   │
│                                          │
│  ────────────────────────────────────  │
│                                          │
│  Total:                     BDT 9900    │
│                                          │
│  Payment Details:                       │
│  Transaction ID: TXN123456789          │
│  Provider: bkash                        │
│  Payment Date: January 15, 2026        │
│                                          │
│  Status: PAID ✓                        │
│                                          │
│  Thank you for your business!          │
└─────────────────────────────────────────┘
```

---

## Quick Reference

### Endpoints Summary

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/billing-local/invoices/manual/:orderId` | GET | Download/view manual invoice | PDF Stream |
| `/billing-local/invoices/paddle/:eventId` | GET | Get Paddle invoice URL | JSON (url) |
| `/billing-local/invoices/check/:source/:id` | GET | Check availability | JSON (available) |

### Query Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `disposition` | `attachment`, `inline` | `attachment` | Download or view in browser |

### Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | Success | Invoice generated/URL returned |
| 400 | Bad Request | Invalid status, unauthorized |
| 401 | Unauthorized | No/invalid JWT token |
| 404 | Not Found | Transaction doesn't exist |
| 500 | Server Error | PDF generation failed, Paddle API error |

---

## Testing Checklist

- [ ] Server running on port 5000
- [ ] Login successful and got JWT token
- [ ] Found completed order ID from database
- [ ] Downloaded manual invoice PDF
- [ ] Opened PDF and verified content
- [ ] Found completed Paddle event ID
- [ ] Got Paddle invoice URL
- [ ] Opened Paddle invoice in browser
- [ ] Tested availability check
- [ ] Tested error cases (invalid ID, unauthorized, etc.)
- [ ] All responses are as expected

---

## Summary

**Both invoice systems are fully functional:**

✅ **Manual Invoices** - Generates professional PDFs from database  
✅ **Paddle Invoices** - Gets invoice URLs from Paddle API using SDK

**Ready to test in Postman right now!**

Your server is running on port 5000. Just follow the steps above to test.
