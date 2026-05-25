import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}', '**/*.test.{js,jsx}'],
    exclude: ['node_modules', 'dist', 'server/node_modules'],
    globals: true,
  },
});
