/**
 * #340 回帰テスト: `astro build` 後に Pagefind 静的インデックスが生成されることを担保する。
 *
 * 背景: Pagefind は `astro-pagefind` 統合により `astro build` の `astro:build:done` フックで
 * `dist/client/pagefind/` に静的全文検索インデックスを出力する (ADR 0015)。CI の E2E ジョブは
 * build ジョブが生成した `dist/` artifact をダウンロードするため、ここでインデックス生成物の
 * 存在を assert すれば CI / Vercel の両ビルド経路でインデックスが出ていることを退行検知できる。
 *
 * 注: Playwright webServer (`astro dev`) ではなく、ビルド成果物 (`dist/client/`) を直接検査する。
 * `astro-pagefind` は dev でも直前の build インデックスを serve するが、本テストの目的は
 * 「ビルドがインデックスを生成したか」なので filesystem を真実源とする。
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const PAGEFIND_DIR = join(process.cwd(), "dist", "client", "pagefind");

test.describe("#340 pagefind index generation", () => {
  test("dist/client/pagefind contains the search bundle and index", () => {
    expect(
      existsSync(PAGEFIND_DIR),
      `Pagefind 出力ディレクトリが存在しない: ${PAGEFIND_DIR}。astro build が pagefind 統合を通っているか確認すること。`
    ).toBe(true);

    // ブラウザ側エントリ (検索 API) が出力されていること。
    expect(existsSync(join(PAGEFIND_DIR, "pagefind.js"))).toBe(true);
    expect(existsSync(join(PAGEFIND_DIR, "pagefind-entry.json"))).toBe(true);

    // ブログ記事 (data-pagefind-body) のフラグメントが 1 件以上生成されていること。
    const fragmentDir = join(PAGEFIND_DIR, "fragment");
    expect(
      existsSync(fragmentDir),
      "fragment ディレクトリが無い (インデックス対象ページが 0 件の可能性)"
    ).toBe(true);
    const fragments = readdirSync(fragmentDir).filter((f) =>
      f.endsWith(".pf_fragment")
    );
    expect(fragments.length).toBeGreaterThan(0);
  });
});
