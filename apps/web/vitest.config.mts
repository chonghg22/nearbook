import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
  test: {
    // SEO 로직은 순수 함수와 메타 라우트라 DOM이 필요 없다.
    // 컴포넌트 렌더 테스트가 필요해지면 jsdom과 JSX 변환 설정을 함께 추가한다.
    environment: 'node',
    include: ['{app,lib}/**/*.test.ts'],
  },
})
