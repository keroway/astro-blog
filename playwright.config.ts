import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 4335);
const HOST = process.env.PLAYWRIGHT_HOST ?? process.env.HOST ?? "localhost";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      `CRON_SECRET="${process.env.CRON_SECRET ?? ""}" ` +
      `VERCEL_DEPLOY_HOOK_URL="${process.env.VERCEL_DEPLOY_HOOK_URL ?? "https://example.com/dummy-deploy-hook"}" ` +
      `npx astro dev --host ${HOST} --port ${PORT}`,
    url: `http://${HOST}:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    stdout: "pipe",
    stderr: "pipe",
  },
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
