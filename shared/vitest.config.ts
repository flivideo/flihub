import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'lcov'],
    thresholds: {
      lines: 27,
      functions: 20,
      branches: 18,
    },
  },
});
