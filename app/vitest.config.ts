import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests don't load the Tailwind plugin
// and don't inherit the /orbo/ base path.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
