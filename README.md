# Expense Backend API Documentation

This documentation provides an overview of the available endpoints in the Expense Backend application.

## Authentication
Most endpoints require authentication using a JWT Bearer token.
- **Header:** `Authorization: Bearer <your_access_token>`

## Modules and Endpoints

### 1. Auth Module
Base URL: `/auth`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login an existing user |
| `POST` | `/auth/logout` | Logout the current user |
| `POST` | `/auth/refresh` | Refresh access token using refresh token |
| `GET` | `/auth/me` | Get current user profile |

**Payloads:**

*   **Register** (`POST /register`)
    ```json
    {
      "name": "John Doe",
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```

*   **Login** (`POST /login`)
    ```json
    {
      "email": "john@example.com",
      "password": "securePassword123"
    }
    ```

### 2. Billing Local Module
Base URL: `/billing_local`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/billing_local/pay` | Process a local payment |
| `GET` | `/billing_local/subscriptions/:userId` | Get user subscriptions |
| `POST` | `/billing_local/cancel` | Cancel current subscription |

**Payloads:**

*   **Pay** (`POST /pay`)
    ```json
    {
      "userId": "uuid-string",
      "planId": "uuid-string",
      "amount": "100.00",
      "reference": "payment-ref (optional)",
      "note": "Payment note (optional)"
    }
    ```

### 3. Budgets Module
Base URL: `/budgets`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/budgets` | Create a new budget |
| `GET` | `/budgets` | Get all budgets for the user |
| `GET` | `/budgets/:id` | Get a specific budget |
| `PATCH` | `/budgets/:id` | Update a budget |
| `DELETE` | `/budgets/:id` | Delete a budget |

**Payloads:**

*   **Create Budget** (`POST /`)
    ```json
    {
      "categoryId": "uuid-string",
      "amount": "500.00"
    }
    ```

*   **Update Budget** (`PATCH /:id`)
    ```json
    {
      "amount": "600.00"
    }
    ```

### 4. Categories Module
Base URL: `/categories`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/categories` | Create a new category |
| `GET` | `/categories` | Get all categories |
| `GET` | `/categories/:id` | Get a specific category |
| `PATCH` | `/categories/:id` | Update a category |
| `DELETE` | `/categories/:id` | Delete a category (use `?force=true` to force delete) |

**Payloads:**

*   **Create Category** (`POST /`)
    ```json
    {
      "name": "Groceries",
      "type": "EXPENSE"
    }
    ```
    *Types: `EXPENSE`, `INCOME`*

*   **Update Category** (`PATCH /:id`)
    ```json
    {
      "name": "Food & Dining",
      "type": "EXPENSE"
    }
    ```

### 5. Insights Module
Base URL: `/insights`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/insights` | Get financial insights (Requires Feature: insights) |

### 6. Merge Module
Base URL: `/merge`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/merge/suggestions` | Get merge suggestions. Query: `?name=partialName` |
| `POST` | `/merge` | Apply merge of duplicates |

**Payloads:**

*   **Apply Merge** (`POST /`)
    ```json
    {
      "sourceNames": ["Uber", "Uber Ride"],
      "targetName": "Uber"
    }
    ```

### 7. Plans Module
Base URL: `/plans`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/plans` | Get all available plans |
| `GET` | `/plans/:id` | Get a specific plan |

### 8. Predictions Module
Base URL: `/predictions`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/predictions` | Get financial predictions (Requires Feature: premium) |
| `POST` | `/predictions/refresh` | Refresh predictions (Requires Feature: premium) |

### 9. Transactions Module
Base URL: `/transactions`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/transactions/create` | Create a new transaction |
| `GET` | `/transactions/all` | Get all transactions. Query: `?limit=10&offset=0` |
| `GET` | `/transactions/:id` | Get a transaction |
| `PATCH` | `/transactions/:id` | Update a transaction |
| `DELETE` | `/transactions/:id` | Delete a transaction |

**Payloads:**

*   **Create Transaction** (`POST /create`)
    ```json
    {
      "name": "Lunch at Cafe",
      "amount": 15.50,
      "date": "2023-10-27T12:00:00.000Z", // Optional, defaults to now
      "categoryId": "uuid-string", // Optional
      "note": "Business lunch" // Optional
    }
    ```

*   **Update Transaction** (`PATCH /:id`)
    ```json
    {
      "name": "Lunch",
      "amount": 16.00
    }
    ```

### 10. Users Module
Base URL: `/users`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/users/:id` | Get user profile (Self or SuperAdmin) |
| `PATCH` | `/users/:id` | Update user profile (Self or SuperAdmin) |

**Payloads:**

*   **Update User** (`PATCH /:id`)
    ```json
    {
      "name": "Jane Doe",
      "email": "jane@example.com"
    }
    ```


Auth: Registration, Login, Logout, Refresh Token, Profile.
Billing Local: Payments, Subscriptions, Cancellation.
Budgets: CRUD operations for budgets.
Categories: CRUD operations for expenses/income categories.
Insights: Financial insights endpoint.
Merge: Duplicate merging suggestions and application.
Plans: Viewing available subscription plans.
Predictions: premium financial predictions.
Transactions: Full transaction management (Create, Read, Update, Delete).
Users: User profile management.