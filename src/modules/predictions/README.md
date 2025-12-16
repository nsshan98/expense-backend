# Predictions Module

The Predictions module is designed to forecast a user's future spending based on their historical transaction data. This helps users budget more effectively by providing estimated monthly expenses for each category.

## How It Works

### 1. Data Analysis (Lookback Period)
The system analyzes transactions from a configurable past period.
- **Default Lookback**: 60 days.
- **Configuration**: This value can be adjusted using the `PREDICTION_LOOKBACK_DAYS` environment variable.

### 2. Calculation Logic
The prediction algorithm follows these steps:
1.  **Fetch Transactions**: Retrieves all transactions for the user within the lookback window.
2.  **Group by Category**: Aggregates spending totals for each category.
3.  **Daily Average**: Calculates the average daily spend for each category (`Total Spent / Lookback Days`).
4.  **Monthly Projection**: Extrapolates the daily average to a 30-day month (`Daily Average * 30`).

### 3. Caching Mechanism
To ensure performance and avoid recalculating data on every request, predictions are **cached** in the database (`predictions_cache` table).- **Storage**: Predictions are stored with a timestamp.
- **Refresh**: The cache is updated explicitly via the refresh endpoint.

## API Endpoints

### 1. Get Predictions
- **Endpoint**: `GET /predictions`
- **Access**: Authenticated Users.
- **Description**: Returns the currently cached predictions for the user.

### 2. Refresh Predictions
- **Endpoint**: `POST /predictions/refresh`
- **Access**: Premium Users Only (Requires `premium` feature flag).
- **Description**: Triggers a recalculation of predictions based on the latest transaction data and updates the cache.

## Key Files
- `predictions.service.ts`: Contains the business logic for calculating and caching predictions.
- `predictions.controller.ts`: Handles HTTP requests and enforces feature guards.
- `entities/predictions_cache.schema.ts`: Defines the database schema for storing cached predictions.
