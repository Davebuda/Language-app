import { defineConfig, devices } from '@playwright/test'
import * as path from 'node:path'

const PORT = process.env.HARNESS_PORT ?? '3100'
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')

export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 2,
  retries: 0,
  timeout: 30_000,
  reporter: [
    ['list'],
    ['json', { outputFile: '../../reports/playwright-results.json' }],
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {
      name: 'harness',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx next dev --turbopack --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    cwd: PROJECT_ROOT,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
