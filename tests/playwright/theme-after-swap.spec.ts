import { expect, test } from "@playwright/test";

// #354 リグレッション: View Transitions のクライアント遷移後にテーマが失われないこと。
// data-theme は CSS 上 [data-theme="dark"] のみで有効 (matchMedia フォールバックの
// CSS は無い) ため、swap 後に <html data-theme> が再付与されるかで判定する。
test.describe("#354 theme persists across client-side navigation", () => {
  test("OS dark (no localStorage) stays dark after header link navigation", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    // localStorage 未設定 = OS 設定依存の状態を保証する
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    // ヘッダーの blog リンクでクライアントサイド遷移する
    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("explicit light choice is preserved after navigation", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("theme", "light"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
