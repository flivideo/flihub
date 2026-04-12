import '@testing-library/jest-dom';

// config.ts calls getApiUrl() at module load time which accesses window.location.
// Ensure it's defined before any test file imports config.ts.
if (typeof window !== 'undefined' && !window.location) {
  Object.defineProperty(window, 'location', {
    value: { protocol: 'http:', hostname: 'localhost' },
    writable: true,
  });
}
