import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}', '**/*.test.{js,jsx}'],
    // server/test: sunucu paketleriyle (express…) node:test altında koşar
    // (cd server && npm test); kökte o paketler kurulu değil.
    exclude: ['node_modules', 'dist', 'server/node_modules', 'server/test/**'],
    globals: true,
  },
});
