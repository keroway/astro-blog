import { expect, test } from "@playwright/test";

// #897 リグレッション: 「初期設定に戻す」が localStorage の可否に依存せず、
// 実際の表示設定とチェック状態の両方を初期化すること。
const BLOCK_STORAGE = () => {
  const fail = () => {
    throw new Error("localStorage blocked");
  };
  Storage.prototype.getItem = fail;
  Storage.prototype.setItem = fail;
  Storage.prototype.removeItem = fail;
};

async function enableAll(page: import("@playwright/test").Page) {
  await page.locator("#a11y-trigger").click();
  await page.locator("#a11y-reduce-motion").check();
  await page.locator('input[name="a11y-font-size"][value="large"]').check();
  await page.locator("#a11y-text-spacing").check();
  await page.locator("#a11y-underline-links").check();
}

async function expectInitial(page: import("@playwright/test").Page) {
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/reduce-motion/);
  await expect(html).not.toHaveClass(/fs-large/);
  await expect(html).not.toHaveClass(/text-spacing/);
  await expect(html).not.toHaveClass(/underline-links/);
  await expect(page.locator("#a11y-reduce-motion")).not.toBeChecked();
  await expect(
    page.locator('input[name="a11y-font-size"][value="normal"]')
  ).toBeChecked();
  await expect(page.locator("#a11y-text-spacing")).not.toBeChecked();
  await expect(page.locator("#a11y-underline-links")).not.toBeChecked();
}

test.describe("#897 a11y menu reset", () => {
  test("resets settings when localStorage works", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    await enableAll(page);
    await page.locator("#a11y-reset").click();
    await expectInitial(page);
  });

  test("resets settings when localStorage throws", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addInitScript(BLOCK_STORAGE);
    await page.goto("/");
    await enableAll(page);
    await expect(page.locator("html")).toHaveClass(/text-spacing/);
    await page.locator("#a11y-reset").click();
    await expectInitial(page);
  });
});
