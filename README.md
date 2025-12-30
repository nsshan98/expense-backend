# Expense Backend API Documentation

This documentation provides a comprehensive guide to the API endpoints of the Expense Backend application.

## 🔐 Authentication & Security

The API uses a dual-token authentication system:
1.  **Access Token (JWT)**: Used for authorizing requests to protected resources.
    *   **Header**: `Authorization: Bearer <access_token>`
    *   **Expiration**: Short-lived (e.g., 15 minutes).
2.  **Refresh Token**: Used to obtain new access tokens when the current one expires.
    *   **Storage**: HTTP-Only `Refresh` Cookie.
    *   **Expiration**: Long-lived (e.g., 7 days).

---

## 📚 Modules and Endpoints

### 1. Analytics Module
Get detailed spending analytics and forecasts.
**Base URL**: `/analytics`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/breakdown` | Get spending breakdown by category. Query: `?startDate=...&endDate=...` | Yes |
| `GET` | `/trends` | Get monthly spending trends. Query: `?year=2023` | Yes |
| `GET` | `/forecast/end-of-month` | Get predicted end-of-month spending totals. | Yes |
| `GET` | `/forecast/rolling` | Get 30-day forecast based on past habits. | Yes |

#### Responses

**Get Breakdown (`GET /analytics/breakdown`)**
```json
[
  {
    "categoryName": "Food",
    "totalAmount": 1500.00,
    "percentage": 25.5
  },
  {
    "categoryName": "Transport",
    "totalAmount": 500.00,
    "percentage": 8.5
  }
]
```

**Get Trends (`GET /analytics/trends`)**
```json
[
    { "month": 1, "total": 4500, "income": 5000 },
    { "month": 2, "total": 3200, "income": 5000 }
]
```

---

### 2. Auth Module
Manage user authentication, registration, and tokens.
**Base URL**: `/auth`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user account. | No |
| `POST` | `/login` | Authenticate user and receive tokens. | No |
| `POST` | `/logout` | Invalidate the refresh token. | Yes (Refresh Cookie) |
| `POST` | `/refresh` | Exchange a valid refresh token for a new access token. | Yes (Refresh Cookie) |
| `GET` | `/me` | Retrieve the authenticated user's profile. | Yes (Bearer) |

#### Payloads & Responses

**Register (`POST /auth/register`)**
*Payload*
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword123!" // Min length 4
}
```
*Response*
```json
{
  "user": {
    "id": "uuid",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "USER",
    "created_at": "2023-12-01T10:00:00.000Z"
  },
  "accessToken": "ey..."
}
```

**Login (`POST /auth/login`)**
*Payload*
```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```
*Response*
```json
{
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "..." },
  "accessToken": "ey..."
}
```

---

### 3. Billing Local Module
Handle subscriptions, local payments, and manual transaction reviews.
**Base URL**: `/billing-local`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/requests` | **Phase 1**: Initiate a subscription request (User). | Yes |
| `POST` | `/payments` | **Phase 3**: Submit payment details for a request (User). | Yes |
| `GET` | `/submissions/pending` | List all pending submissions (Admin). | Yes (Admin) |
| `GET` | `/requests/:id` | Get details of a specific subscription request. | Yes |
| `POST` | `/submissions/:id/review`| Approve or Reject a submission (Admin). | Yes (Admin) |
| `GET` | `/status` | Get current subscription status or latest pending order. | Yes |
| `GET` | `/history` | Get transaction history for the user. | Yes |

#### Payloads & Responses

**Create Subscription Request (`POST /billing-local/requests`)**
*Payload*
```json
{
  "planId": "uuid-of-plan",
  "duration": "monthly", // or "yearly"
  "transactionId": "TXN_12345",
  "provider": "bkash", // or "nagad", "rocket", etc.
  "senderNumber": "017...", // Optional
  "note": "Payment note" // Optional
}
```
*Response*
```json
{
  "id": "uuid-request",
  "status": "pending_payment",
  "amount": 500
}
```

**Submit Payment Info (`POST /billing-local/payments`)**
*Payload*
```json
{
  "requestId": "uuid-of-request",
  "transactionId": "TXN_12345",
  "provider": "bkash",
  "senderNumber": "017..." // Optional
}
```

**Review Submission (`POST /billing-local/submissions/:id/review`)**
*Payload*
```json
{
  "action": "approve", // or "reject"
  "reason": "Invalid Transaction ID" // Optional
}
```

---

### 4. Budgets Module
Manage financial budgets.
**Base URL**: `/budgets`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create new budgets (Bulk supported). | Yes |
| `GET` | `/all` | List budgets. Query: `?month=MM-YYYY` | Yes |
| `GET` | `/:id` | Get details of a specific budget. | Yes |
| `PATCH` | `/:id` | Update an existing budget. | Yes |
| `DELETE` | `/:id` | Delete a budget. | Yes |

#### Payloads & Responses

**Create Budgets (`POST /budgets/create`)**
*Payload (Array)*
```json
[
  {
    "categoryId": "uuid",
    "amount": 500.00,
    "month": "12-2025" // Optional
  },
  {
    "categoryName": "Groceries",
    "categoryType": "EXPENSE",
    "amount": 300.00
  }
]
```
*Response*
```json
[
  {
    "id": "uuid",
    "amount": 500.00,
    "categoryId": "uuid",
    "month": "12-2025"
  }
]
```

---

### 5. Categories Module
Manage expense and income categories.
**Base URL**: `/categories`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a custom category. | Yes |
| `GET` | `/all` | List all categories. | Yes |
| `GET` | `/:id` | Get category details. | Yes |
| `PATCH` | `/:id` | Update a category. | Yes |
| `DELETE` | `/:id` | Delete a category. | Yes |

#### Payloads & Responses

**Create Category (`POST /categories/create`)**
*Payload*
```json
{
  "name": "Groceries",
  "type": "EXPENSE" // or "INCOME"
}
```
*Response*
```json
{
  "id": "uuid",
  "name": "Groceries",
  "type": "EXPENSE",
  "is_default": false
}
```

---

### 6. Insights Module
Access financial analytics.
**Base URL**: `/insights`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Aggregated financial insights. | Yes |
| `GET` | `/dashboard` | Dashboard overview metrics. | Yes |

#### Responses

**Dashboard (`GET /insights/dashboard`)**
```json
{
  "totalExpense": 1200,
  "totalIncome": 5000,
  "recentTransactions": [...]
}
```

---

### 7. Merge Module
Tools to identify and merge duplicate entries.
**Base URL**: `/merge`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/suggestions` | Search for merge suggestions. Query: `?name=...` | Yes |
| `POST` | `/` | Execute a merge of multiple items into one. | Yes |

#### Payloads & Responses

**Apply Merge (`POST /merge`)**
*Payload*
```json
{
  "sourceNames": ["Uber Eats", "Uber Trip"], // Names to be merged
  "targetName": "Uber" // Resulting name
}
```
*Response*
```json
{
  "message": "Merged 5 transactions under 'Uber'"
}
```

---

### 8. Plans Module
Administer and view available subscription plans.
**Base URL**: `/plans`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a new plan. | Yes (Admin) |
| `GET` | `/all-plans` | List all plans. | No |
| `GET` | `/:id` | Get details of a specific plan. | No |
| `PATCH` | `/:id` | Update a plan. | Yes (Admin) |
| `DELETE` | `/:id` | Delete a plan. | Yes (Admin) |

#### Payloads & Responses

**Create Plan (`POST /plans/create`)**
*Payload*
```json
{
  "name": "Pro Plan",
  "price_monthly": 10.99,
  "price_yearly": 100.00,
  "features": {
    "max_categories": 50,
    "max_budgets": 20,
    "max_transactions": 1000,
    "can_export_data": true,
    "is_premium": true
  }
}
```
*Response*
```json
{
  "id": "uuid",
  "name": "Pro Plan",
  "price_monthly": 10.99,
  "features": { ... }
}
```

---

### 9. Predictions Module
AI-driven financial predictions.
**Base URL**: `/predictions`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get financial forecasts. | Yes (Premium) |
| `POST` | `/refresh` | Force refresh of prediction data. | Yes (Premium) |

---

### 10. Transactions Module
Core transaction management.
**Base URL**: `/transactions`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Record a new transaction. | Yes |
| `GET` | `/all` | Get paginated transactions. | Yes |
| `GET` | `/:id` | Get a single transaction. | Yes |
| `PATCH` | `/:id` | Update a transaction. | Yes |
| `DELETE` | `/:id` | Delete a transaction. | Yes |

**GET /all Parameters:**
*   `limit`: Number of items (default: 5)
*   `offset`: Skip count (default: 0)
*   `startDate`: Filter by date (YYYY-MM-DD)
*   `endDate`: Filter by date (YYYY-MM-DD)
*   `search`: Search term for name/notes
*   `type`: Filter by 'EXPENSE' or 'INCOME'

#### Payloads & Responses

**Create Transaction (`POST /transactions/create`)**
*Payload*
```json
{
  "name": "Starbucks Coffee",
  "amount": 5.75,
  "date": "2023-12-15T08:30:00.000Z", // Optional, defaults to now
  "categoryId": "uuid", // Optional
  "note": "Morning coffee" // Optional
}
```
*Response*
```json
{
  "id": "uuid",
  "name": "Starbucks Coffee",
  "amount": 5.75,
  "date": "...",
  "categoryId": "..."
}
```

---

### 11. Users Module
User profile management.
**Base URL**: `/users`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/:id` | Get user profile. Restricted to self or SuperAdmin. | Yes |
| `PATCH` | `/:id` | Update user profile & settings. Restricted to self or SuperAdmin. | Yes |
| `PATCH` | `/:id/password` | Change user password. Restricted to self or SuperAdmin. | Yes |

#### Payloads & Responses

**Update User Profile (`PATCH /users/:id`)**
*Payload*
```json
{
  "name": "Jane NewName",
  "email": "jane.new@example.com",
  "geminiApiKey": "AIzaSy...", // Updates encrypted API key
  "weekendDays": [5, 6] // 0=Sun, 1=Mon... Updates weekend preference
}
```
*Response*
```json
{
  "id": "uuid",
  "name": "Jane NewName",
  "email": "jane.new@example.com",
  "hasGeminiKey": true,
  "geminiApiKeyMasked": "AIza...511X"
}
```

**Change Password (`PATCH /users/:id/password`)**
*Payload*
```json
{
    "oldPassword": "currentPassword123",
    "newPassword": "newSecurePassword123!" // Min length 4
}
```