/**
 * #346 回帰テスト: ヒーロー見出しが中間幅で 4 行に崩れないことを担保する。
 *
 * 背景: `.hero__title` は 2 セグメント (`手を動かし、` / `書きとめる。`) を `<br />`
 * で区切る。font-size の可変項 (旧 `8vw`) が大きすぎると 901〜1042px 付近で
 * 各セグメントがさらに折り返し、計 4 行に崩れていた。
 *
 * 検証は `Range.getClientRects()` の top 値の種類数で実際の表示行数を判定する
 * (`scrollWidth==clientWidth` や要素の `getClientRects()` では行内折り返しを拾えない)。
 * `<br />` 由来の幅0ファントム rect は行数に数えないよう除外する。
 */

import { expect, test } from "@playwright/test";

async function heroTitleLineCount(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const el = document.querySelector(".hero__title");
    if (!el) return -1;
    const range = document.createRange();
    range.selectNodeContents(el);
    const tops = new Set(
      Array.from(range.getClientRects())
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => Math.round(r.top))
    );
    return tops.size;
  });
}

test.describe("#346 hero title responsive", () => {
  // 2 カラム grid が有効な帯 (>900px) を網羅。各セグメント 1 行ずつ = 計 2 行が期待値。
  const widths = [901, 940, 980, 1000, 1042, 1080, 1120, 1280, 1440];

  for (const width of widths) {
    test(`hero title stays within 2 lines at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      const lines = await heroTitleLineCount(page);
      expect(lines).toBeLessThanOrEqual(2);
    });
  }
});
