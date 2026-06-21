/**
 * #344 / #343 回帰テスト: `/keystatic` 管理画面が Google Fonts を読み込まないことを担保する。
 *
 * 背景: `@keystatic/core` は管理 UI の Provider に Inter を Google Fonts から読み込む
 * `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` をハードコードしていた
 * (ADR 0014)。`pnpm patch` で当該 `<link>` 注入を除去した。
 *
 * 検証戦略:
 *   1. ランタイム: `/keystatic` ロード中に `fonts.googleapis.com` / `fonts.gstatic.com` への
 *      ネットワークリクエストが 0 件であること (OG 画像 E2E と同様の `page.on('request')`)。
 *   2. バンドル: `/keystatic` が読み込む JS モジュールのいずれにも Google Fonts の URL 文字列が
 *      含まれないこと。管理 UI は CSR で初期描画に認証を要し headless では Provider が
 *      mount しきらないため、ランタイム監視だけでは退行を取りこぼす。実際に配信される
 *      バンドル本文を直接検査することでパッチの効力 (= 退行) を確実に捕捉する。
 *
 * 注: Playwright の webServer は `astro dev` で起動するため、dev モードでは Keystatic 統合が
 * mount され `/keystatic` が到達可能 (本番/preview の 404 とは異なる)。
 */

import { expect, test } from "@playwright/test";

const GOOGLE_FONTS_RE = /fonts\.(googleapis|gstatic)\.com/;

test.describe("#344 keystatic google fonts zero-request", () => {
  test("/keystatic neither requests nor bundles Google Fonts", async ({
    page,
  }) => {
    const fontRequests: string[] = [];
    // `/keystatic` が読み込む JS バンドルの URL を収集する。
    const scriptUrls = new Set<string>();

    page.on("request", (req) => {
      const url = req.url();
      if (GOOGLE_FONTS_RE.test(url)) fontRequests.push(url);
      if (req.resourceType() === "script") scriptUrls.add(url);
    });

    await page.goto("/keystatic");
    await page.waitForLoadState("networkidle");

    // 1. ランタイムで Google Fonts へのリクエストが発生していないこと。
    expect(
      fontRequests,
      `Google Fonts へのリクエストが検出された: ${fontRequests.join(", ")}`
    ).toHaveLength(0);

    // 2. 配信された JS バンドルのいずれにも Google Fonts の URL が含まれないこと。
    //    (パッチが外れると keystatic-core-ui 由来のチャンクに URL が再出現する)
    expect(
      scriptUrls.size,
      "JS バンドルが 1 つも読み込まれていない"
    ).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const url of scriptUrls) {
      const res = await page.request.get(url);
      if (!res.ok()) continue;
      const body = await res.text();
      if (GOOGLE_FONTS_RE.test(body)) offenders.push(url);
    }
    expect(
      offenders,
      `Google Fonts URL を含む JS バンドル: ${offenders.join(", ")}`
    ).toHaveLength(0);
  });
});
