import { execFileSync } from "node:child_process";
import { defineConfig, devices } from "@playwright/test";

// ローカルで複数の worktree / エージェントが E2E を並走させるとポートが衝突し、
// reuseExistingServer: !CI により別プロセスの dev サーバーへ誤接続しかねない (#1011)。
// 明示指定 (PLAYWRIGHT_PORT / PORT / DEPLOY_HOOK_PORT) が無いときだけ OS に空きポートを
// 割り当てさせ、process.env へ書き戻す。config は main と各 worker で評価されるが、
// worker は main の process.env を継承するので同じポートに揃う。CI は固定ポートのまま。
function pickFreePorts(count: number): number[] {
  const script = `
    const net = require("node:net");
    const count = Number(process.argv[1]);
    const servers = [];
    const ports = [];
    for (let i = 0; i < count; i++) {
      const server = net.createServer();
      server.listen(0, () => {
        ports[i] = server.address().port;
        if (ports.filter(Boolean).length === count) {
          console.log(ports.join(" "));
          for (const s of servers) s.close();
        }
      });
      servers.push(server);
    }
  `;
  const out = execFileSync(process.execPath, ["-e", script, String(count)], {
    encoding: "utf8",
  });
  return out.trim().split(" ").map(Number);
}

if (!process.env.CI) {
  const needApp = !process.env.PLAYWRIGHT_PORT && !process.env.PORT;
  const needHook = !process.env.DEPLOY_HOOK_PORT;
  if (needApp || needHook) {
    const ports = pickFreePorts(Number(needApp) + Number(needHook));
    if (needApp) process.env.PLAYWRIGHT_PORT = String(ports.shift());
    if (needHook) process.env.DEPLOY_HOOK_PORT = String(ports.shift());
  }
}

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? process.env.PORT ?? 4335);
const HOST = process.env.PLAYWRIGHT_HOST ?? process.env.HOST ?? "localhost";
const HOOK_PORT = Number(process.env.DEPLOY_HOOK_PORT ?? 4336);
const HOOK_URL = `http://127.0.0.1:${HOOK_PORT}/`;

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["dot"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
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
