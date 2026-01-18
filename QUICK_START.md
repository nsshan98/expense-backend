# Invoice System - Quick Start

## 🚀 Test in 3 Steps

### 1. Login
```bash
POST http://localhost:5000/auth/login
Body: { "email": "...", "password": "..." }
→ Copy access_token
```

### 2. Download Manual Invoice
```bash
GET http://localhost:5000/billing-local/invoices/manual/{ORDER_ID}
Headers: Authorization: Bearer {TOKEN}
→ Save PDF
```

### 3. Get Paddle Invoice
```bash
GET http://localhost:5000/billing-local/invoices/paddle/{EVENT_ID}
Headers: Authorization: Bearer {TOKEN}
→ Copy URL → Open in browser
```

---

## 📚 Full Documentation

See **INVOICE_SYSTEM_GUIDE.md** for:
- Complete API reference
- Detailed Postman testing
- Frontend integration
- Troubleshooting
- Error handling

---

## ✅ Status

- Manual Invoices: **WORKING** ✓
- Paddle Invoices: **WORKING** ✓
- Server: **RUNNING** on port 5000 ✓

**Ready to test now!**
