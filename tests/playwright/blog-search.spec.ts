/**
 * #341 回帰テスト: /blog の全文検索 UI。
 *
 * - JS 有効時: 検索ボックスが表示され、日本語キーワードでタイトル・本文がヒットする。
 *   検索中は既存のカテゴリ/年フィルタと静的一覧が隠れ、クリアで復帰する (共存)。
 * - JS 無効時: 検索ボックスは隠れたまま、既存の一覧表示が壊れない (プログレッシブエンハンスメント)。
 *
 * 注: Playwright webServer (`astro dev`) でも astro-pagefind が直前 build のインデックスを serve する。
 */

import { expect, test } from "@playwright/test";

test.describe("#341 /blog full-text search", () => {
  test("search box appears and Japanese query hits title/body", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    const box = page.locator("[data-blog-search]");
    await expect(box).toBeVisible();

    const input = page.locator(".blog-search__input");
    await expect(input).toBeEnabled();
    await input.fill("読書");

    // 結果が描画されるまで待つ (debounce + Pagefind 検索)。
    await expect(page.locator(".blog-search__result").first()).toBeVisible();
    const count = await page.locator(".blog-search__result").count();
    expect(count).toBeGreaterThan(0);

    // 検索モード中は既存フィルタ/一覧が隠れる。
    await expect(page.locator(".filter-bar")).toBeHidden();
    await expect(page.locator("#posts-list")).toBeHidden();

    // ステータスに件数が出る。
    await expect(page.locator(".blog-search__status")).toContainText(
      "検索結果"
    );
  });

  test("clearing search restores the filter view", async ({ page }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    await page.locator(".blog-search__input").fill("設計");
    await expect(page.locator(".blog-search__result").first()).toBeVisible();

    await page.locator(".blog-search__clear").click();

    await expect(page.locator(".filter-bar")).toBeVisible();
    await expect(page.locator("#posts-list")).toBeVisible();
    await expect(page.locator(".blog-search__results")).toBeHidden();
  });

  test("category filter is a real link and coexists with search UI", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    // #648: フィルタは JS トグルの button ではなく静的リンクへ移行した。
    const categoryLinks = page.locator(
      '.filter-bar a.filter-btn:not([aria-current="page"])'
    );
    const total = await categoryLinks.count();
    test.skip(total < 1, "カテゴリが 0 件のため絞り込み検証をスキップ");

    const href = await categoryLinks.first().getAttribute("href");
    expect(href).toMatch(/^\/blog\/category\/[^/]+\/$/);

    // 検索 UI 表示中でもフィルタバーの DOM は維持される (JS 非対応環境の互換性)。
    await expect(page.locator(".filter-bar")).toBeVisible();
  });
});

test.describe("#648 category archive page", () => {
  test("category link navigates to a full, cross-page archive", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    const categoryLinks = page.locator(
      '.filter-bar a.filter-btn:not([aria-current="page"])'
    );
    const total = await categoryLinks.count();
    test.skip(total < 1, "カテゴリが 0 件のため絞り込み検証をスキップ");

    const firstLink = categoryLinks.first();
    const href = await firstLink.getAttribute("href");
    expect(href).toBeTruthy();
    await firstLink.click();
    await page.waitForURL(`**${href}`);

    // アーカイブページ自身のフィルタバーで、いま見ているカテゴリが active になっている。
    await expect(
      page.locator('.filter-bar a.filter-btn[aria-current="page"]')
    ).toHaveAttribute("href", href as string);

    const rows = await page.locator(".posts-list .post-row").count();
    expect(rows).toBeGreaterThan(0);

    // URL 単体で共有・再訪しても同じ一覧が出る (#648 の受け入れ条件)。
    await page.goto(href as string);
    const rowsAfterReload = await page.locator(".posts-list .post-row").count();
    expect(rowsAfterReload).toBe(rows);
  });
});

test.describe("#588 astro:page-load 経由の init (ClientRouter swap)", () => {
  test("navigating from another page keeps search working (no double-init)", async ({
    page,
  }) => {
    // トップページ経由でヘッダーのリンクをクリックし ClientRouter の swap を発生させる。
    // #588: astro:after-swap 購読だと即時実行との併発で二重 init していた。
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await page.waitForURL("**/blog");

    const input = page.locator(".blog-search__input");
    await expect(input).toBeEnabled();
    await input.fill("読書");
    await expect(page.locator(".blog-search__result").first()).toBeVisible();
    // 二重 init だと検索結果が重複描画されるため、件数で単発 init を確認する。
    const count = await page.locator(".blog-search__result").count();
    await page.locator(".blog-search__clear").click();
    await input.fill("読書");
    await expect(page.locator(".blog-search__result").first()).toBeVisible();
    expect(await page.locator(".blog-search__result").count()).toBe(count);
  });
});

test.describe("#341 progressive enhancement (no-JS)", () => {
  test.use({ javaScriptEnabled: false });

  test("search box hidden and post list intact without JS", async ({
    page,
  }) => {
    await page.goto("/blog");
    await expect(page.locator("[data-blog-search]")).toBeHidden();
    await expect(page.locator("#posts-list")).toBeVisible();
    const rows = await page.locator("#posts-list .post-row").count();
    expect(rows).toBeGreaterThan(0);
  });
});
