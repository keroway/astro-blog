import { expect, test } from "@playwright/test";

test.describe("CMS admin smoke", () => {
  test("login screen shows branded Japanese CTAs", async ({ page }) => {
    await page.goto("/admin/", { waitUntil: "networkidle" });

    await expect(page).toHaveTitle(/keroway CMS|Sveltia CMS/);
    // ログイン画面の文言は Sveltia CMS 同梱の ja ロケール由来
    // (src/pages/admin.astro が localStorage["sveltia-cms.prefs"] で
    // prefs.locale = "ja" を固定する、issue #622)。
    await expect(
      page.getByRole("button", { name: "ローカルレポジトリで作業" })
    ).toBeVisible();
    // Sveltia は {$service} 変数展開時に Unicode isolate 文字 (U+2068/U+2069)
    // を挿入するため、完全一致ではなく正規表現でマッチさせる。
    await expect(
      page.getByRole("button", { name: /GitHub.*にログイン/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "アクセストークンを使用してログイン" })
    ).toBeVisible();
    await expect(page.getByLabel("CMS の使い方")).toContainText(
      "astro-blog のルート"
    );
  });

  test("login screen classifies visible actions", async ({ page }) => {
    await page.goto("/admin/", { waitUntil: "networkidle" });

    await expect(
      page.locator('[data-keroway-admin-action="primary"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator('[data-keroway-admin-action="secondary"]')
    ).not.toHaveCount(0);
    await expect(
      page.locator('[data-keroway-admin-action="subtle"]')
    ).not.toHaveCount(0);
  });
});
