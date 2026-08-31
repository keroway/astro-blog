/**
 * #689 回帰テスト: コマンドパレット (⌘K / Ctrl+K) の全文検索。
 *
 * - 正常系: Pagefind が読み込める環境では既知の記事語で検索結果が出る。
 * - 異常系: Pagefind の読み込み・検索に失敗した場合、結果を無通知で固定ナビ候補に
 *   縮退させず、「検索を利用できません」等の状態を利用者に示す (#689)。
 */

import { expect, test } from "@playwright/test";

test.describe("#689 command palette search", () => {
  test("opens with ⌘K/Ctrl+K and finds a known article via Pagefind", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Control+k");
    const palette = page.locator("#command-palette");
    await expect(palette).toBeVisible();

    const input = page.locator("#command-palette-input");
    await expect(input).toBeFocused();
    await input.fill("読書");

    await expect(page.locator("#command-palette-status")).toBeHidden();
    await expect(
      page.locator("#command-palette-results .command-palette__item")
    ).not.toHaveCount(0);
  });

  test("shows an unavailable status when Pagefind fails to load", async ({
    page,
  }) => {
    await page.route("**/pagefind/**", (route) => route.abort());

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.keyboard.press("Control+k");
    const input = page.locator("#command-palette-input");
    await expect(input).toBeFocused();
    await input.fill("Blog");

    const status = page.locator("#command-palette-status");
    await expect(status).toBeVisible();
    await expect(status).toContainText("検索を利用できません");

    // 固定ナビ候補自体は維持される (全文検索結果ではないことは status 側で区別)。
    await expect(
      page.locator("#command-palette-results .command-palette__item")
    ).not.toHaveCount(0);
  });
});
