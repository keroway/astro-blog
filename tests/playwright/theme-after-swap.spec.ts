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

// #1000: 保存失敗した手動選択がクライアント遷移後に取り消されないこと。
test.describe("#1000 theme choice survives failed save across navigation", () => {
  test("setItem throws: manual choice kept after navigation", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error("quota");
      };
    });
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("setItem and getItem both throw: manual choice kept", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error("blocked");
      };
      Storage.prototype.getItem = () => {
        throw new Error("blocked");
      };
    });
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("save succeeds: stored value is used after navigation", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();
    await page.locator("#theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator('.kw-header__nav a[href="/blog"]').click();
    await expect(page).toHaveURL(/\/blog\/?$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

// #952: localStorage 読み込みが例外でも初回初期化で OS 設定を解決すること。
test.describe("#952 theme init when localStorage.getItem throws", () => {
  test("falls back to OS dark on first paint", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error("storage blocked");
      };
    });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
