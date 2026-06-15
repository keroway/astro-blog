/**
 * axe-core による a11y smoke テスト
 *
 * 除外ルールと理由:
 *   - color-contrast: デザイントークン (#d9b382 on #f3f1ec = 1.73:1) が WCAG AA に未達。
 *     Kanagawa/Tokaido Field Notes パレットの制約。別途トークン改訂 Issue で対応予定。
 *   - heading-order: FocusCard.astro が h3 を使用しており h1→h3 でスキップが発生。
 *     コンポーネント設計変更を別 Issue で対応予定。
 *   - page-has-heading-one: /blog/ の SectionHead が <span> で描画され h1 が存在しない。
 *     SectionHead のヘッダーレベル対応を別 Issue で対応予定。
 *
 * 上記 3 ルールを除いた残り 100+ ルールで退行を自動検知する。
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EXCLUDED_RULES = [
  "color-contrast",
  "heading-order",
  "page-has-heading-one",
];

test.describe("a11y smoke", () => {
  test("/ has no axe violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("/blog has no axe violations", async ({ page }) => {
    await page.goto("/blog");
    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("blog post has no axe violations", async ({ page }) => {
    await page.goto("/blog/book-pragmatic-programmer/");
    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("/about has no axe violations", async ({ page }) => {
    await page.goto("/about");
    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
