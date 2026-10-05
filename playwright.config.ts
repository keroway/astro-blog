import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 4335);
const HOST = process.env.PLAYWRIGHT_HOST ?? process.env.HOST ?? "localhost";
const HOOK_PORT = Number(process.env.DEPLOY_HOOK_PORT ?? 4336);
const HOOK_URL = `http://127.0.0.1:${HOOK_PORT}/`;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: [
    {
      // 親環境の VERCEL_DEPLOY_HOOK_URL は使わず、ローカルのフック fixture に固定する。
      command: "node tests/playwright/fixtures/deploy-hook-server.mjs",
      env: { DEPLOY_HOOK_PORT: String(HOOK_PORT) },
      url: `${HOOK_URL}__posts`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npx astro dev --host ${HOST} --port ${PORT}`,
      env: {
        CRON_SECRET: process.env.CRON_SECRET ?? "",
        VERCEL_DEPLOY_HOOK_URL: HOOK_URL,
      },
      url: `http://${HOST}:${PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] },
    },
  ],
});
