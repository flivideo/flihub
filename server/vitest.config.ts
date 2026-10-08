import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // a stale server/dist/ would otherwise double the test count
    exclude: [...configDefaults.exclude, 'dist/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    thresholds: {
      lines: 16,
      functions: 20,
      branches: 18,
    },
  },
});
