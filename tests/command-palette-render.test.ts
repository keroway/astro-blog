/**
 * #752 回帰テスト: コマンドパレットの検索結果タイトルが HTML として解釈され、
 * `Array<T>` のようなHTML記法を含むタイトルの一部が欠落する不具合。
 *
 * `src/components/CommandPalette.astro` の inline <script> は Astro コンポーネント
 * 内にあり通常の import では取得できないため、Issue #752 の再現手順と同じ方法
 * (ソースを TypeScript コンパイラで transpile → happy-dom 上で実行) でテストする。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { Window } from "happy-dom";
import ts from "typescript";
import { describe, expect, it } from "vitest";

interface CommandItem {
  title: string;
  url: string;
  note?: string;
}

function renderWithRealCommandPalette(items: CommandItem[]) {
  const source = readFileSync(
    join(process.cwd(), "src/components/CommandPalette.astro"),
    "utf8"
  );
  const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch)
    throw new Error("CommandPalette.astro の <script> が見つからない");

  const window = new Window();
  window.document.body.innerHTML = source.split("<script>")[0];

  const code = ts.transpile(
    `${scriptMatch[1]}\nglobalThis.__renderItems = renderItems;`,
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    }
  );
  const context = vm.createContext({
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    globalThis: {},
  });
  vm.runInContext(code, context);
  (
    context.globalThis as { __renderItems: (items: CommandItem[]) => void }
  ).__renderItems(items);

  return window.document.querySelector(".command-palette__item");
}

describe("#752 CommandPalette renderItems", () => {
  it("keeps HTML-like characters in the title as plain text instead of interpreting them as markup", () => {
    const link = renderWithRealCommandPalette([
      { title: "Array<T> の使い方", url: "/blog/test/", note: "説明" },
    ]);

    expect(link).toBeTruthy();
    const span = link?.querySelector("span");
    expect(span?.textContent).toBe("Array<T> の使い方");
    // <T> が要素として解釈されていれば子要素が生まれる (#752 の再現条件)。
    expect(span?.children.length).toBe(0);
  });

  it("keeps HTML entities in the note as plain text", () => {
    const link = renderWithRealCommandPalette([
      { title: "テスト記事", url: "/blog/test/", note: "A &amp; B" },
    ]);

    const small = link?.querySelector("small");
    expect(small?.textContent).toBe("A &amp; B");
  });
});
