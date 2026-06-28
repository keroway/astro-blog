/**
 * #002 回帰テスト: vercel.json の CSP 設定が enforce モードで、
 * obsolete な CDN allowances を含まないことを確認する。
 *
 * 背景: Plan 001 で /admin の runtime CDN imports を bundle 化したため、
 * CSP から unpkg.com と esm.sh を削除し、Report-Only から enforcing に変更できる。
 * このテストは設定の退行を検知する。
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const VERCEL_JSON = join(process.cwd(), "vercel.json");

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelHeaderConfig {
  source: string;
  headers: VercelHeader[];
}

interface VercelConfig {
  headers?: VercelHeaderConfig[];
}

test.describe("#002 CSP configuration", () => {
  test("vercel.json contains enforcing CSP without obsolete CDN allowances", () => {
    expect(existsSync(VERCEL_JSON), "vercel.json must exist").toBe(true);

    const config = JSON.parse(
      readFileSync(VERCEL_JSON, "utf8")
    ) as VercelConfig;
    const headers = config.headers?.find((h) => h.source === "/(.*)")?.headers;

    expect(headers, "catch-all headers must exist").toBeTruthy();

    const cspHeader = headers?.find((h) => h.key === "Content-Security-Policy");
    const reportOnlyHeader = headers?.find(
      (h) => h.key === "Content-Security-Policy-Report-Only"
    );

    expect(cspHeader, "Content-Security-Policy header must exist").toBeTruthy();

    expect(
      reportOnlyHeader,
      "Content-Security-Policy-Report-Only must not exist (should be enforcing)"
    ).toBeUndefined();

    const cspValue = cspHeader?.value ?? "";

    expect(cspValue, "CSP must not allow https://unpkg.com").not.toContain(
      "https://unpkg.com"
    );

    expect(cspValue, "CSP must not allow https://esm.sh").not.toContain(
      "https://esm.sh"
    );

    expect(cspValue, "CSP must include frame-ancestors 'none'").toContain(
      "frame-ancestors 'none'"
    );
  });
});
