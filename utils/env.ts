/**
 * Central place for environment-dependent config.
 *
 * Values fall back to local defaults so nothing changes for local
 * development, but every value can be overridden via environment
 * variable — this is what lets the *same* test suite run against your
 * local Vendure instance and against whatever URL CI can reach.
 *
 * Locally: reads from a .env file (see .env.example) if present.
 * In CI: set these as repository/environment variables instead of a
 * .env file — see .github/workflows/playwright.yml.
 */
import * as dotenv from 'dotenv';
import * as path from 'node:path';

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

function readEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

export const ENV = {
  storefrontBaseUrl: readEnv('STOREFRONT_BASE_URL', 'http://localhost:3001'),
  adminBaseUrl: readEnv('ADMIN_BASE_URL', 'http://localhost:3000'),

  // Used by the authenticated Shop API tests in tests/api/storefront —
  // see .env.example. Those tests skip automatically if unset.
  apiUsername: process.env.API_USERNAME,
  apiPassword: process.env.API_PASSWORD,
};
