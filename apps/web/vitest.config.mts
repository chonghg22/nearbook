import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    // Pure logic and server-rendered component tests need no browser DOM.
    environment: 'node',
    include: ['{app,lib}/**/*.test.ts'],
  },
})
