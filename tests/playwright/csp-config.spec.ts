/**
 * Plan 002 回帰テスト: vercel.json の CSP 設定が enforce モードであることを担保する。
 *
 * 背景: CSP が `Content-Security-Policy-Report-Only` から `Content-Security-Policy`
 * に切り替えられた (Plan 002)。本テストは vercel.json を読んで以下を assert する:
 *   - キャッチオール headers に `Content-Security-Policy` が含まれる
 *   - `Content-Security-Policy-Report-Only` は含まれない
 *   - CSP 値に `unpkg.com` または `esm.sh` が含まれない
 *   - `frame-ancestors 'none'` が含まれる
 *
 * Playwright の webServer (astro dev) は Vercel ヘッダーを適用しないため、
 * ここでは HTTP レスポンスではなく vercel.json をファイルシステムから直接検査する。
 * pagefind-index.spec.ts と同じアプローチ。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type VercelHeader = { key: string; value: string };
type VercelHeaderRule = { source: string; headers: VercelHeader[] };

test.describe("Plan 002: CSP enforce mode regression", () => {
  const vercelJsonPath = join(process.cwd(), "vercel.json");
  let headers: VercelHeader[];

  test.beforeAll(() => {
    const raw = readFileSync(vercelJsonPath, "utf8");
    let config: { headers?: VercelHeaderRule[] };
    try {
      config = JSON.parse(raw) as { headers?: VercelHeaderRule[] };
    } catch (err) {
      throw new Error(`vercel.json のパースに失敗: ${String(err)}`);
    }
    const catchAll = (config.headers ?? []).find(
      (rule) => rule.source === "/(.*)"
    );
    headers = catchAll?.headers ?? [];
  });

  test("catch-all headers contain Content-Security-Policy (enforcing)", () => {
    const keys = headers.map((h) => h.key);
    expect(
      keys,
      "Content-Security-Policy ヘッダーがキャッチオールルールに存在しない"
    ).toContain("Content-Security-Policy");
  });

  test("catch-all headers do NOT contain Content-Security-Policy-Report-Only", () => {
    const keys = headers.map((h) => h.key);
    expect(
      keys,
      "Content-Security-Policy-Report-Only が残存している (enforce モードに切り替えること)"
    ).not.toContain("Content-Security-Policy-Report-Only");
  });

  test("CSP value does not allow unpkg.com or esm.sh", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    expect(
      cspValue,
      "CSP 値に unpkg.com が含まれている — admin バンドルの CDN 依存が残存している可能性"
    ).not.toContain("unpkg.com");
    expect(
      cspValue,
      "CSP 値に esm.sh が含まれている — admin バンドルの CDN 依存が残存している可能性"
    ).not.toContain("esm.sh");
  });

  test("CSP value includes frame-ancestors 'none'", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    expect(
      cspValue,
      "frame-ancestors 'none' が CSP から削除されている — クリックジャッキング保護が失われる"
    ).toContain("frame-ancestors 'none'");
  });
});
