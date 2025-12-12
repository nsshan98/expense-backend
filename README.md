# Personal Finance MVP Backend

## Prerequisites

- Node.js (>=18)
- pnpm
- PostgreSQL (or Docker to run it)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure environment:
   Copy `.env.example` to `.env`.

   ```bash
   cp .env.example .env
   ```

   The default `.env` assumes a local Postgres instance on port 5432 with user `user`, password `password`, and db `finance`.

3. Start Database:

   **Option A: Using Docker (Recommended)**
   If you have Docker installed:

   ```bash
   docker-compose up -d
   ```

   **Option B: Local PostgreSQL**
   Install PostgreSQL and create a database named `finance`.
   Update `.env` with your credentials if different from default.

4. Run Migrations:
   Once the DB is running:

   ```bash
   pnpm db:migrate
   ```

5. Run Application:
   ```bash
   pnpm start:dev
   ```

## Modules

- Auth: Register, Login (JWT).
- Users: Profile management.
- Plans: Subscription plans.
- Categories: Transaction categories.
- Transactions: Income/Expense tracking.
- FeatureAccess: Subscription gating.

## Testing

```bash
pnpm test
```
