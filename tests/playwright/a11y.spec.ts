/**
 * axe-core による a11y smoke テスト
 *
 * 除外ルールと理由:
 *   - heading-order: FocusCard.astro が h3 を使用しており h1→h3 でスキップが発生。
 *     コンポーネント設計変更を別 Issue で対応予定。
 *   - page-has-heading-one: /blog/ の SectionHead が <span> で描画され h1 が存在しない。
 *     SectionHead のヘッダーレベル対応を別 Issue で対応予定。
 *
 * color-contrast は plans/008 (issue #647) でトークン改訂により解消したため、
 * 2026-08-10 に除外リストから外した。light/dark 両テーマで検証する。
 */

import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const EXCLUDED_RULES = ["heading-order", "page-has-heading-one"];

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
      const results = await new AxeBuilder({ page })
        .disableRules(EXCLUDED_RULES)
        .analyze();
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
      const results = await new AxeBuilder({ page })
        .disableRules(EXCLUDED_RULES)
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
