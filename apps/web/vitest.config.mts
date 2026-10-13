import path from 'node:path'
import { defineConfig } from 'vitest/config'
import ts from 'typescript'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
  // Next needs jsx:preserve; SSR tests need lowered JSX before Vite import analysis.
  // Use the already-installed compiler without changing the production tsconfig.
  plugins: [{
    name: 'test-ssr-jsx',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.tsx(?:$|\?)/.test(id)) return null
      return ts.transpileModule(code, {
        fileName: id,
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText
    },
  }],
  test: {
    // Pure logic and server-rendered component tests need no browser DOM.
    environment: 'node',
    include: ['{app,lib}/**/*.test.ts'],
  },
})
