/**
 * CMS admin (/admin/) の axe-core a11y スモークテスト。
 *
 * 除外ルールと理由:
 *   - aria-allowed-attr: Sveltia CMS 自体がボタンに aria-readonly="false" を付与しており、
 *     keroway 側のコードでは変更できない (@sveltia/cms のビルド済み DOM)。
 *   - meta-viewport: Sveltia CMS がマウント時に viewport meta タグを
 *     maximum-scale=1 へ上書きする。src/pages/admin.astro 側の meta タグではない。
 *   - region: Sveltia CMS のログイン画面 (h1 / 補助メモ / powered-by) が
 *     ランドマーク要素の外に描画される。keroway 側で追加する
 *     `.keroway-admin-shell-note` も同じログイン画面内にあるため対象外。
 *
 * 上記 3 ルールは Sveltia CMS 本体の DOM に起因し、keroway.com 側のコードでは
 * 修正できない。keroway 側で追加するボタン分類・文言・テーマ CSS に起因する
 * 新規の critical/serious 違反がないことを検証する。
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EXCLUDED_RULES = ["aria-allowed-attr", "meta-viewport", "region"];

test.describe("CMS admin a11y smoke", () => {
  test("/admin/ login screen has no unexpected axe violations", async ({
    page,
  }) => {
    await page.goto("/admin/", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/keroway CMS|Sveltia CMS/);
    await expect(
      page.getByRole("button", { name: "ローカルリポジトリで編集" })
    ).toBeVisible();
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
