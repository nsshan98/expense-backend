# Plan Features & Strategy Guide

This document outlines the features available in your application that can be used to differentiate between **Free** and **Premium** subscription plans. It includes both **Enforceable Limits** (checked by the backend) and **Display Features** (marketing points for the frontend).

## 1. Enforceable Backend Features
These are strict limits defined in the `features` column of your `subscription_plans` table. Your backend code (Guards/Services) uses these to approve or reject user actions.

| Feature Key | Type | Description | Recommended Limit (Free) | Recommended Limit (Premium) |
| :--- | :--- | :--- | :--- | :--- |
| `max_budgets` | `number` | Maximum number of active budgets/categories a user can track. | 5 | Unlimited (or 100) |
| `max_categories` | `number` | Maximum custom categories user can create. | 10 | Unlimited |
| `max_transactions` | `number` | Limit on stored transactions (e.g., per month). | 50 / month | Unlimited |
| `can_export_data` | `boolean` | Permission to download data (CSV/PDF). | `false` | `true` |
| `is_premium` | `boolean` | Master flag for advanced features (AI, Merging). | `false` | `true` |

### **Advanced "Premium-Only" Capabilities:**
These features should check the `is_premium` flag:
1.  **AI Predictions** (`/predictions`): Forecasting future expenses.
2.  **Smart Merge Suggestions** (`/merge/suggestions`): AI/Algorithm to clean up duplicate names.
3.  **Dashboard Insights** (`/insights`): Advanced charts beyond basic totals.
4.  **Savings Goals** (`/budgets/goals`): Tracking long-term savings targets.

---

## 2. Frontend Display Features
These are the marketing bullet points shown on your Pricing Page. They are stored in the `display_features` JSON column. Use a **Key-Value** structure so the Frontend can align them in a comparison table.

**Format:** `Record<string, string | boolean>`

| Display Key | Label (Frontend) | Free Value | Premium Value |
| :--- | :--- | :--- | :--- |
| `max_budgets` | **Budgets** | "5 Active Budgets" | "Unlimited" |
| `transaction_history` | **History** | "30 Days" | "Lifetime" |
| `ai_predictions` | **AI Predictions** | `false` (❌) | `true` (✅) |
| `export` | **Data Export** | `false` (❌) | `true` (✅) |
| `smart_merge` | **Smart Cleanup** | `false` (❌) | `true` (✅) |
| `support` | **Support** | "Community" | "Priority 24/7" |

---

## 3. Recommended Plan Structure

### **Option A: Free Plan (The "Hook")**
Designed for casual users. Good enough to start, but restrictive for power users.
*   **Name**: "Starter" / "Free"
*   **Price**: $0
*   **Features Payload**:
    ```json
    {
      "max_budgets": 5,
      "max_categories": 10,
      "max_transactions": 50,
      "can_export_data": false,
      "is_premium": false
    }
    ```
*   **Display Payload**:
    ```json
    {
      "max_budgets": "5 Active",
      "transaction_history": "Last 30 Days",
      "ai_predictions": false,
      "smart_merge": false,
      "export": false,
      "support": "Basic"
    }
    ```

### **Option B: Premium Plan (The "Upsell")**
Designed for serious budgeters who want automation and insights.
*   **Name**: "Pro" / "Gold"
*   **Price**: $9/mo or $90/yr
*   **Features Payload**:
    ```json
    {
      "max_budgets": 100,
      "max_categories": 100,
      "max_transactions": 10000,
      "can_export_data": true,
      "is_premium": true
    }
    ```
*   **Display Payload**:
    ```json
    {
      "max_budgets": "Unlimited",
      "transaction_history": "Unlimited",
      "ai_predictions": true,
      "smart_merge": true,
      "export": true,
      "support": "Priority"
    }
    ```

---

## 4. Implementation Checklist

1.  **Backend Checks**:
    *   Ensure `FeatureAccessService` checks `is_premium` for specific endpoints (`/predictions`, `/merge`, `/insights`).
    *   Ensure `BudgetsService` checks `max_budgets` before creating a new one.
    *   Ensure `TransactionsService` checks `max_transactions` before adding.

2.  **Frontend Rendering**:
    *   Fetch plans from `/plans/all-plans`.
    *   Loop through your feature list (rows).
    *   For each plan (column), display the value from `plan.display_features[row_key]`.

3.  **Soft Deletes**:
    *   Always use the `remove(id)` endpoint which now sets `is_active: false`. Do not hard delete plans.
