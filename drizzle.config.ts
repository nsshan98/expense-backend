import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/modules/**/entities/*.schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
