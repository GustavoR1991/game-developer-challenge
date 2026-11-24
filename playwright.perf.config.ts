import { defineConfig } from '@playwright/test';

const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/perf',
  testMatch: '**/*.perf.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    serviceWorkers: 'allow',
    timezoneId: 'UTC',
    launchOptions: {
      args: [
        '--ignore-gpu-blocklist',
        '--enable-gpu-rasterization',
        '--use-angle=default',
        '--enable-precise-memory-info',
      ],
    },
  },
  projects: [{ name: 'chromium-perf', use: { browserName: 'chromium' } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
