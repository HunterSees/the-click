import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Optional: to use describe, it, expect globally
    environment: 'node',
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      // Optional: include/exclude files for coverage
      // include: ['server/**/*.js'],
      // exclude: ['server/tests/**', 'server/index.js'], // Example: exclude tests and main server file if it's hard to unit test directly
    },
  },
});
