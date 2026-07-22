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

  test("existing category filter keeps working alongside search", async ({
    page,
  }) => {
    await page.goto("/blog");
    await page.waitForLoadState("networkidle");

    const categoryButtons = page.locator('[data-filter-type="category"]');
    const total = await categoryButtons.count();
    test.skip(total < 2, "カテゴリが 1 つ以下のため絞り込み検証をスキップ");

    await categoryButtons.nth(1).click();
    await expect(page.locator("#filter-count")).toBeVisible();
    await expect(page.locator("#filter-count")).toContainText("件");
  });
});

test.describe("#588 astro:page-load 経由の init (ClientRouter swap)", () => {
  test("navigating from another page keeps search and filter working (no double-init)", async ({
    page,
  }) => {
    // トップページ経由でヘッダーのリンクをクリックし ClientRouter の swap を発生させる。
    // #588: astro:after-swap 購読だとフィルタ側は即時実行との併発で二重 init していた。
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await page.waitForURL("**/blog");

    const input = page.locator(".blog-search__input");
    await expect(input).toBeEnabled();
    await input.fill("読書");
    await expect(page.locator(".blog-search__result").first()).toBeVisible();
    await page.locator(".blog-search__clear").click();

    const categoryButtons = page.locator('[data-filter-type="category"]');
    const total = await categoryButtons.count();
    test.skip(total < 2, "カテゴリが 1 つ以下のため絞り込み検証をスキップ");

    // 二重 init だとリスナーが 2 重登録され pushState/applyFilter が 2 回走るが、
    // 結果は冪等なので filter-count の値そのもので検知はできない。
    // ここではクリック 1 回で正しく反映されること（例外・二重表示が無いこと）を確認する。
    await categoryButtons.nth(1).click();
    await expect(page.locator("#filter-count")).toBeVisible();
    await expect(page.locator("#filter-count")).toContainText("件");
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
