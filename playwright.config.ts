import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173/react-pokemon-zukan/',
    channel: process.platform === 'win32' ? 'chrome' : undefined,
    trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [375, 768, 1280].map(width => ({ name: `${width}px`, use: { viewport: { width, height: 900 } } })),
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/react-pokemon-zukan/', reuseExistingServer: !process.env.CI },
});
