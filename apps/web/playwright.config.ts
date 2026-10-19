import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45000,
  expect: { timeout: 12000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:3100', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: [
    { command: 'node e2e/server.mjs', url: 'http://127.0.0.1:4101/__health', reuseExistingServer: false },
    {
      command: 'node e2e/start.mjs',
      url: 'http://127.0.0.1:3100/search',
      timeout: 240000,
      reuseExistingServer: false,
      env: {
        INTERNAL_API_URL: 'http://127.0.0.1:4101', NEXT_PUBLIC_API_BASE_URL: '/api',
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:4101', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'isolated-e2e-key',
        APP_ENV: 'test', VERCEL_ENV: 'development',
        DATABASE_URL: 'postgres://unused:unused@127.0.0.1:1/unused',
        NEXT_PUBLIC_NAVER_MAP_CLIENT_ID: '', NEXT_PUBLIC_GA_ID: '',
      },
    },
  ],
})
