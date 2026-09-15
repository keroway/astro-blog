/**
 * axe-core による a11y smoke テスト
 *
 * color-contrast は plans/008 (issue #647) でトークン改訂により解消したため、
 * 2026-08-10 に除外リストから外した。heading-order / page-has-heading-one は
 * SectionHead を見出し要素 (h1/h2) で描画するよう #779 で修正し、除外を解除した。
 * light/dark 両テーマで検証する。
 */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PAGES = [
  { name: "/", path: "/" },
  { name: "/blog", path: "/blog" },
  { name: "blog post", path: "/blog/book-pragmatic-programmer/" },
  { name: "/works", path: "/works" },
  { name: "/about", path: "/about" },
];

async function gotoStable(page: Page, path: string) {
  // Astro 7 (Vite 8) triggers eager dependency optimization in dev mode,
  // which fires a Vite HMR reload that can destroy the JS context mid-axe analysis.
  // `networkidle` ensures the reload completes before analysis begins.
  await page.goto(path, { waitUntil: "networkidle" });
}

test.describe("a11y smoke (light)", () => {
  for (const { name, path } of PAGES) {
    test(`${name} has no axe violations`, async ({ page }) => {
      await gotoStable(page, path);
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("a11y smoke (dark)", () => {
  test.beforeEach(async ({ page }) => {
    // Header.astro の resolveTheme() と同じ localStorage キーで dark を固定する。
    await page.addInitScript(() => {
      localStorage.setItem("theme", "dark");
    });
  });

  for (const { name, path } of PAGES) {
    test(`${name} has no axe violations in dark theme`, async ({ page }) => {
      await gotoStable(page, path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
