import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/unit/**/*.test.ts'],
    pool: 'forks',
    testTimeout: 15000,
    env: {
      NODE_ENV: 'test',
      NEXTAUTH_SECRET: 'test-secret-for-tenant-preview-hmac',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(ROOT, 'src'),
    },
  },
});
