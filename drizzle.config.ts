import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export default defineConfig({
  // Database connection
  schema: './src/db/schema/*.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/chief_ai'
  },

  // Introspection settings for pulling existing schema
  introspect: {
    casing: 'preserve' // Keep existing snake_case column names
  },

  // Migration settings
  verbose: true,
  strict: true
});
