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

### 1. Auth Module
Manage user authentication, registration, and tokens.
**Base URL**: `/auth`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Register a new user account. | No |
| `POST` | `/login` | Authenticate user and receive tokens. | No |
| `POST` | `/logout` | Invalidate the refresh token. | Yes (Refresh Cookie) |
| `POST` | `/refresh` | Exchange a valid refresh token for a new access token. | Yes (Refresh Cookie) |
| `GET` | `/me` | Retrieve the authenticated user's profile. | Yes (Bearer) |

#### Payloads

**Register (`POST /auth/register`)**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "StrongPassword123!" // Min length 4
}
```

**Login (`POST /auth/login`)**
```json
{
  "email": "jane@example.com",
  "password": "StrongPassword123!"
}
```

---

### 2. Billing Local Module
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

#### Payloads

**Create Subscription Request (`POST /billing-local/requests`)**
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

**Submit Payment Info (`POST /billing-local/payments`)**
```json
{
  "requestId": "uuid-of-request",
  "transactionId": "TXN_12345",
  "provider": "bkash",
  "senderNumber": "017..." // Optional
}
```

**Review Submission (`POST /billing-local/submissions/:id/review`)**
```json
{
  "action": "approve", // or "reject"
  "reason": "Invalid Transaction ID" // Optional
}
```

---

### 3. Budgets Module
Manage financial budgets.
**Base URL**: `/budgets`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create new budgets (Bulk supported). | Yes |
| `GET` | `/all` | List budgets. Query: `?month=MM-YYYY` | Yes |
| `GET` | `/:id` | Get details of a specific budget. | Yes |
| `PATCH` | `/:id` | Update an existing budget. | Yes |
| `DELETE` | `/:id` | Delete a budget. | Yes |

#### Payloads

**Create Budgets (`POST /budgets/create`)**
*Accepts an Array of Budget Objects*
```json
[
  {
    "categoryId": "123e4567-e89b-12d3-a456-426614174002",
    "amount": 500.00,
    "month": "12-2025" // Optional, defaults to current month
  },
  {
    "categoryName": "Groceries",
    "categoryType": "EXPENSE",
    "amount": 300.00
  }
]
```

**Update Budget (`PATCH /budgets/:id`)**
```json
{
  "amount": 750.00
}
```

---

### 4. Categories Module
Manage expense and income categories.
**Base URL**: `/categories`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a custom category. | Yes |
| `GET` | `/all` | List all categories. | Yes |
| `GET` | `/:id` | Get category details. | Yes |
| `PATCH` | `/:id` | Update a category. | Yes |
| `DELETE` | `/:id` | Delete a category. | Yes |

#### Payloads

**Create Category (`POST /categories/create`)**
```json
{
  "name": "Groceries",
  "type": "EXPENSE" // or "INCOME"
}
```

**Update Category (`PATCH /categories/:id`)**
```json
{
  "name": "Food & Dining"
}
```

---

### 5. Insights Module
Access financial analytics.
**Base URL**: `/insights`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Aggregated financial insights. | Yes |
| `GET` | `/dashboard` | Dashboard overview metrics. | Yes |

---

### 6. Merge Module
Tools to identify and merge duplicate entries.
**Base URL**: `/merge`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/suggestions` | Search for merge suggestions. Query: `?name=...` | Yes |
| `POST` | `/` | Execute a merge of multiple items into one. | Yes |

#### Payloads

**Apply Merge (`POST /merge`)**
```json
{
  "sourceNames": ["Uber Eats", "Uber Trip"], // Names to be merged
  "targetName": "Uber" // Resulting name
}
```

---

### 7. Plans Module
Administer and view available subscription plans.
**Base URL**: `/plans`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Create a new plan. | Yes (Admin) |
| `GET` | `/all-plans` | List all plans. | No |
| `GET` | `/:id` | Get details of a specific plan. | No |
| `PATCH` | `/:id` | Update a plan. | Yes (Admin) |
| `DELETE` | `/:id` | Delete a plan. | Yes (Admin) |

#### Payloads

**Create Plan (`POST /plans/create`)**
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

---

### 8. Predictions Module
AI-driven financial predictions.
**Base URL**: `/predictions`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Get financial forecasts. | Yes (Premium) |
| `POST` | `/refresh` | Force refresh of prediction data. | Yes (Premium) |

---

### 9. Transactions Module
Core transaction management.
**Base URL**: `/transactions`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/create` | Record a new transaction. | Yes |
| `GET` | `/all` | Get paginated transactions. Query: `?limit=10&offset=0` | Yes |
| `GET` | `/:id` | Get a single transaction. | Yes |
| `PATCH` | `/:id` | Update a transaction. | Yes |
| `DELETE` | `/:id` | Delete a transaction. | Yes |

#### Payloads

**Create Transaction (`POST /transactions/create`)**
```json
{
  "name": "Starbucks Coffee",
  "amount": 5.75,
  "date": "2023-12-15T08:30:00.000Z", // Optional, defaults to now
  "categoryId": "123e4567-e89b-12d3-a456-426614174002", // Optional
  "note": "Morning coffee" // Optional
}
```

**Update Transaction (`PATCH /transactions/:id`)**
```json
{
  "amount": 6.00,
  "note": "Corrected price"
}
```

---

### 10. Users Module
User profile management.
**Base URL**: `/users`

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/:id` | Get user profile. Restricted to self or SuperAdmin. | Yes |
| `PATCH` | `/:id` | Update user profile. Restricted to self or SuperAdmin. | Yes |
| `PATCH` | `/:id/password` | Change user password. Restricted to self or SuperAdmin. | Yes |

#### Payloads

**Update User Profile (`PATCH /users/:id`)**
```json
{
  "name": "Jane NewName",
  "email": "jane.new@example.com"
}
```

**Change Password (`PATCH /users/:id/password`)**
```json
{
    "oldPassword": "currentPassword123",
    "newPassword": "newSecurePassword123!" // Min length 4
}
```