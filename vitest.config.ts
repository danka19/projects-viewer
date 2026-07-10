import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Component test harness only. Node contract tests stay on `node --test`;
// this config intentionally omits the Tailwind plugin for fast DOM tests.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/components/**/*.test.tsx'],
    setupFiles: ['tests/components/setup.ts'],
  },
});
