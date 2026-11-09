import { defineConfig } from 'drizzle-kit';
import { getConfig } from './src/config/env.js';

const config = getConfig();

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: config.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});