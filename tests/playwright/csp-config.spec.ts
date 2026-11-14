/**
 * Plan 002 回帰テスト: vercel.json の CSP 設定が enforce モードであることを担保する。
 *
 * 背景: CSP が `Content-Security-Policy-Report-Only` から `Content-Security-Policy`
 * に切り替えられた (Plan 002)。本テストは vercel.json を読んで以下を assert する:
 *   - キャッチオール headers に `Content-Security-Policy` が含まれる
 *   - `Content-Security-Policy-Report-Only` は含まれない
 *   - `script-src` に `unpkg.com` または `esm.sh` が含まれない (CDN スクリプト依存なし)
 *   - `connect-src` に `https://unpkg.com` が含まれる (Sveltia CMS のバージョンチェック / Prism言語定義取得に必要)
 *   - `connect-src` に `data:` が含まれる (data URI の SVG プレビュー取得に必要)
 *   - `frame-src` に `blob:` が含まれる (CMS プレビュー iframe に必要)
 *   - `frame-ancestors 'self'` が含まれる
 *   - `script-src` に `'unsafe-inline'` が含まれない (#706 / #819 / #820, ADR 0021)
 *   - `base-uri 'self'` / `object-src 'none'` / `form-action 'self'` が含まれる
 *   - ビルド済み HTML に、実行されるインラインスクリプトが無い (上記 CSP で止まるため)
 *
 * Playwright の webServer (astro dev) は Vercel ヘッダーを適用しないため、
 * ここでは HTTP レスポンスではなく vercel.json をファイルシステムから直接検査する。
 * pagefind-index.spec.ts と同じアプローチ。
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
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

  test("script-src does not allow unpkg.com or esm.sh (no CDN script dependency)", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    const scriptSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(
      scriptSrc,
      "script-src に unpkg.com が含まれている — admin バンドルの CDN 依存が残存している可能性"
    ).not.toContain("unpkg.com");
    expect(
      scriptSrc,
      "script-src に esm.sh が含まれている — admin バンドルの CDN 依存が残存している可能性"
    ).not.toContain("esm.sh");
  });

  test("connect-src allows https://unpkg.com (Sveltia CMS version check / Prism defs)", () => {
    // Sveltia CMS 公式 CSP ガイド (https://sveltiacms.app/en/docs/security) より:
    // 自前バンドル (script-src 不要) でも、内蔵のバージョンチェックや Prism/PDF.js の
    // 言語定義取得のため connect-src には https://unpkg.com が必要。
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    const connectSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("connect-src")) ?? "";
    expect(
      connectSrc,
      "connect-src に https://unpkg.com が含まれていない — Sveltia CMS の内部バージョンチェック等が CSP 違反になる"
    ).toContain("https://unpkg.com");
  });

  test("connect-src allows data: for CMS data URI preview assets", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    const connectSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("connect-src")) ?? "";
    expect(
      connectSrc,
      "connect-src に data: が含まれていない — Sveltia CMS の data URI プレビュー取得が CSP 違反になる"
    ).toContain("data:");
  });

  test("frame-src allows blob: for CMS preview iframe", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    const frameSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("frame-src")) ?? "";
    expect(
      frameSrc,
      "frame-src に blob: が含まれていない — Sveltia CMS のプレビュー iframe が CSP 違反になる"
    ).toContain("blob:");
  });

  test("style-src and font-src do not allow fonts.googleapis.com / fonts.gstatic.com (self-hosted fonts, no Google Fonts dependency)", () => {
    // ADR 0013 でウェブフォントは Astro Fonts API + Fontsource による自己ホストに移行済み。
    // Keystatic 時代の名残 (issue #766) が再混入していないことを固定する。
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    const styleSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("style-src")) ?? "";
    const fontSrc =
      cspValue.split(";").find((d) => d.trim().startsWith("font-src")) ?? "";
    expect(
      styleSrc,
      "style-src に fonts.googleapis.com が含まれている — Google Fonts への外部依存が復活している"
    ).not.toContain("fonts.googleapis.com");
    expect(
      fontSrc,
      "font-src に fonts.gstatic.com が含まれている — Google Fonts への外部依存が復活している"
    ).not.toContain("fonts.gstatic.com");
  });

  test("CSP value includes frame-ancestors 'self'", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const cspValue = csp?.value ?? "";
    expect(
      cspValue,
      "frame-ancestors 'self'` が含まれていない — 同一オリジンの CMS プレビュー iframe かクリックジャッキング保護のどちらかが壊れている"
    ).toContain("frame-ancestors 'self'");
  });

  test("script-src does not allow 'unsafe-inline' (inline scripts are externalized, ADR 0021)", () => {
    const csp = headers.find((h) => h.key === "Content-Security-Policy");
    expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
    const scriptSrc =
      (csp?.value ?? "")
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("script-src")) ?? "";
    const tokens = scriptSrc.split(/\s+/);
    expect(
      tokens,
      "script-src に 'unsafe-inline' が復活している — インラインスクリプトを外部化したまま維持すること (ADR 0021)"
    ).not.toContain("'unsafe-inline'");
    expect(tokens, "script-src が 'self' を許可していない").toContain("'self'");
    // BaseHead.astro の <script type=\"speculationrules\"> (#474) を許可するキーワード。
    // 実行可能な JavaScript は許可しない (speculationrules ブロックのみ)。
    expect(
      tokens,
      "'inline-speculation-rules' が無い — Speculation Rules の prerender が CSP で止まる"
    ).toContain("'inline-speculation-rules'");
  });

  for (const [directive, value] of [
    ["base-uri", "'self'"],
    ["object-src", "'none'"],
    ["form-action", "'self'"],
  ] as const) {
    test(`CSP sets ${directive} ${value}`, () => {
      const csp = headers.find((h) => h.key === "Content-Security-Policy");
      expect(csp, "CSP ヘッダーが見つからない").toBeTruthy();
      const found =
        (csp?.value ?? "")
          .split(";")
          .map((d) => d.trim())
          .find((d) => d.startsWith(`${directive} `)) ?? "";
      expect(
        found,
        `${directive} が ${value} で指定されていない (default-src にフォールバックしない指令)`
      ).toBe(`${directive} ${value}`);
    });
  }
});

/**
 * script-src から 'unsafe-inline' を外している (上記) ため、HTML に実行されるインライン
 * スクリプトが残ると本番だけで止まる。Playwright の webServer (astro dev) は CSP ヘッダーを
 * 適用せず、dev ではインライン展開もされないので、ビルド済み HTML を直接検査して固定する。
 *
 * 許可するインライン <script> は、実行されないデータブロックだけ:
 *   - type="application/ld+json" (JSON-LD。CSP の対象外)
 *   - type="speculationrules" ('inline-speculation-rules' で許可)
 *
 * Astro は小さいバンドル済みスクリプトを HTML へインライン展開するので、
 * astro.config.mjs の vite.build.assetsInlineLimit で JS のインライン化を止めている。
 */
test.describe("#820: built HTML has no executable inline scripts", () => {
  const distDir = join(process.cwd(), "dist", "client");
  const DATA_BLOCK_TYPES = new Set(["application/ld+json", "speculationrules"]);

  test("every inline <script> in dist/client is a non-executing data block", () => {
    expect(
      existsSync(distDir),
      "dist/client が無い — 先に `pnpm exec astro build` を実行すること"
    ).toBe(true);

    const htmlFiles = (
      readdirSync(distDir, { recursive: true, encoding: "utf8" }) as string[]
    ).filter((f) => f.endsWith(".html"));
    expect(htmlFiles.length, "dist/client に HTML が無い").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of htmlFiles) {
      const html = readFileSync(join(distDir, file), "utf8");
      for (const m of html.matchAll(
        /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi
      )) {
        const attrs = m[1] ?? "";
        if (/\bsrc\s*=/i.test(attrs)) continue; // 外部スクリプトは 'self' で許可される
        const type =
          /\btype\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]?.toLowerCase() ?? "";
        if (DATA_BLOCK_TYPES.has(type)) continue;
        offenders.push(
          `${file}: <script${attrs}> ${(m[2] ?? "").trim().slice(0, 60)}`
        );
      }
    }
    expect(
      offenders.slice(0, 10),
      `実行されるインラインスクリプトが ${offenders.length} 件ある — script-src 'self' では本番で止まる。外部ファイル化するか、小さいスクリプトのインライン展開 (vite.build.assetsInlineLimit) を確認すること (ADR 0021)`
    ).toEqual([]);
  });
});
