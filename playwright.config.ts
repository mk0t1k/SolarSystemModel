import { defineConfig, devices } from '@playwright/test'

// Убедимся, что localhost и 127.0.0.1 не идут через корпоративный прокси
process.env.NO_PROXY = 'localhost,127.0.0.1'
process.env.no_proxy = 'localhost,127.0.0.1'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          env: {
            ...process.env,
            NO_PROXY: 'localhost,127.0.0.1',
            no_proxy: 'localhost,127.0.0.1'
          }
        }
      }
    }
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
})
