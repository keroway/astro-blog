/**
 * #843 回帰テスト: 記事共有の URL コピー結果を利用者へ通知する。
 *
 * - 成功: ボタン表示が「コピーしました」になり、失敗表示は出ない。
 * - 拒否 / clipboard 不在: 失敗を role=status で通知し、選択済みの URL 入力欄を出す。
 */

import { expect, test } from "@playwright/test";

const POST = "/blog/clojure";

const stubClipboard = (impl: string) => {
  const clipboard =
    impl === "missing"
      ? undefined
      : {
          writeText: () =>
            impl === "resolve"
              ? Promise.resolve()
              : Promise.reject(new DOMException("denied", "NotAllowedError")),
        };
  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
  });
};

test.describe("#843 post share copy feedback", () => {
  test("success shows copied label without failure message", async ({
    page,
  }) => {
    await page.addInitScript(stubClipboard, "resolve");
    await page.goto(POST);
    const btn = page.locator(".post-share__copy");
    await btn.click();
    await expect(btn).toContainText("コピーしました");
    await expect(page.locator("[data-share-status]")).toBeEmpty();
    await expect(page.locator("[data-share-fallback]")).toBeHidden();
  });

  for (const impl of ["reject", "missing"] as const) {
    test(`clipboard ${impl} announces failure and shows selectable URL`, async ({
      page,
    }) => {
      await page.addInitScript(stubClipboard, impl);
      await page.goto(POST);
      const btn = page.locator(".post-share__copy");
      await btn.click();
      await expect(page.locator("[data-share-status]")).toContainText(
        "コピーに失敗しました"
      );
      const fallback = page.locator("[data-share-fallback]");
      await expect(fallback).toBeVisible();
      await expect(fallback).toBeFocused();
      await expect(btn).toBeEnabled();
      await expect(btn).toContainText("URL をコピー");
    });
  }
});
