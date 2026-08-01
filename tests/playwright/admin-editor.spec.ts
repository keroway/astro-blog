/**
 * CMS admin (/admin/?test-repo) のエディタ画面スモークテスト。
 *
 * 本番の GitHub backend や File System Access API のログインを経由せず、
 * @sveltia/cms が提供する OPFS ベースの test-repo backend
 * (`config.backend = { name: "test-repo" }`) でコレクション一覧・編集画面・
 * プレビューまで到達する。src/pages/admin.astro 側でこの切り替えは
 * `import.meta.env.DEV` かつ `?test-repo` クエリがある場合のみ有効 (issue #621)。
 *
 * OPFS (`navigator.storage.getDirectory()`) は chromium 系エンジンでのみ
 * 安定して動作するため、このファイルは chromium プロジェクトに限定する。
 * これは playwright.config.ts の projects を削る変更ではなく、OPFS 非対応
 * ブラウザでの誤検出を避けるための spec 単位の絞り込み。
 *
 * 除外ルールは tests/playwright/admin-a11y.spec.ts と同じ方針
 * (Sveltia CMS 本体の DOM に起因し、keroway 側では修正できない)。
 * エディタ画面固有の追加除外:
 *   - aria-input-field-name: 本文フィールドの Lexical リッチテキストエディタ
 *     (contenteditable な role="textbox") に Sveltia が accessible name を
 *     付けていない。
 *   - aria-valid-attr-value: サイドバーのタブ (`role="radiogroup"`) が
 *     存在しない要素 ID を `aria-controls` に指定している。
 *   - html-lang-valid: プレビュー iframe の `<html lang="_default">` は
 *     Sveltia のプレビューテンプレートの初期値。
 *   - label: Markdown ソース編集用の隠し `<textarea>` にラベルが無い。
 *   - nested-interactive: プレビュー幅リサイズハンドル内に
 *     「ペイン入れ替え」ボタンがネストしている。
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const EXCLUDED_RULES = [
  "aria-allowed-attr",
  "meta-viewport",
  "region",
  "aria-input-field-name",
  "aria-valid-attr-value",
  "html-lang-valid",
  "label",
  "nested-interactive",
];

test.describe("CMS admin editor smoke (test-repo backend)", () => {
  // biome-ignore lint/correctness/noEmptyPattern: Playwright は fixtures 未使用時も第一引数に {} を要求する
  test.beforeEach(({}, testInfo) => {
    // browserName はエンジン名 ("chromium") を返し、mobile-chromium プロジェクトも
    // これに一致してしまうため、プロジェクト名そのもので絞り込む。
    test.skip(
      testInfo.project.name !== "chromium",
      "test-repo backend は OPFS 依存のため chromium プロジェクトのみで検証する"
    );
  });

  test("collection list, new entry form, and preview pane are reachable", async ({
    page,
  }) => {
    await page.goto("/admin/?test-repo", { waitUntil: "networkidle" });

    await page
      .getByRole("button", {
        name: /テストレポジトリで作業|Work with Test Repository/,
      })
      .click();

    // コレクション一覧 (ブログ記事)。コレクション名は config.yml の label
    // (日本語固定文字列) がそのまま使われ、CMS の UI ロケールに影響されない。
    await expect(
      page.getByRole("option", { name: /ブログ記事|Blog posts?/i })
    ).toBeVisible();

    // 「新しいエントリーを作成」という accessible name はグローバルの新規作成
    // ドロップダウンとコレクション固有のボタンの双方に付くため、一意な
    // 「エントリーリスト」グループ内に絞る (issue #622 で ja ロケールを既定化)。
    await page
      .getByRole("group", { name: /Entry List|エントリーリスト/ })
      .getByRole("button", { name: /Create New Entry|新しいエントリーを作成/ })
      .click();

    // 編集フォームとプレビューペインの両方が描画されること
    await expect(
      page.getByLabel(/記事タイトル|記事概要|Title|Description/).first()
    ).toBeVisible();
    await expect(
      page.locator("iframe.preview, [class*='preview']").first()
    ).toBeVisible();
  });

  test("new entry editor has no unexpected axe violations", async ({
    page,
  }) => {
    await page.goto("/admin/?test-repo", { waitUntil: "networkidle" });

    await page
      .getByRole("button", {
        name: /テストレポジトリで作業|Work with Test Repository/,
      })
      .click();
    // 「新しいエントリーを作成」という accessible name はグローバルの新規作成
    // ドロップダウンとコレクション固有のボタンの双方に付くため、一意な
    // 「エントリーリスト」グループ内に絞る (issue #622 で ja ロケールを既定化)。
    await page
      .getByRole("group", { name: /Entry List|エントリーリスト/ })
      .getByRole("button", { name: /Create New Entry|新しいエントリーを作成/ })
      .click();
    await page.waitForTimeout(1000);

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
