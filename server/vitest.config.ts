import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // only src/ — a stale gitignored server/dist/ would otherwise double the test count
    include: ['src/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 16,
        functions: 20,
        branches: 18,
      },
    },
  },
});
