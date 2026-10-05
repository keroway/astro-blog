/**
 * #830 回帰テスト: コマンドパレットの非同期検索が入力順と逆順に完了しても、
 * 最新の入力に対応する結果だけが DOM に反映されることを確認する。
 *
 * src/components/CommandPalette.astro の <script> を transpile して happy-dom 上で実行し、
 * Pagefind の search / data() をスタブ化して完了順序を制御する。
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import {
  type HTMLInputElement as HappyHTMLInputElement,
  Window,
} from "happy-dom";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const flush = () => new Promise((r) => setImmediate(r));

function setup(fakePagefind: unknown) {
  const source = readFileSync(
    join(process.cwd(), "src/components/CommandPalette.astro"),
    "utf8"
  );
  const script = source.match(/<script>([\s\S]*?)<\/script>/i)?.[1];
  if (!script)
    throw new Error("CommandPalette.astro の <script> が見つからない");

  const window = new Window();
  window.document.body.innerHTML = source.split("<script>")[0];

  const code = ts
    .transpile(script, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    })
    .replace(
      /import\([\s\S]*?pagefindPath\s*\)/,
      "Promise.resolve(fakePagefind)"
    );
  const context = vm.createContext({
    window,
    document: window.document,
    HTMLElement: window.HTMLElement,
    fakePagefind,
  });
  vm.runInContext(code, context);

  const input = window.document.getElementById(
    "command-palette-input"
  ) as unknown as HappyHTMLInputElement;
  const results = window.document.getElementById("command-palette-results");
  const type = (value: string) => {
    input.value = value;
    input.dispatchEvent(new window.Event("input"));
  };
  return { type, results, input, window };
}

const page = (title: string) =>
  Promise.resolve({ url: `/${title}/`, meta: { title }, excerpt: "" });

describe("#830 CommandPalette の非同期検索の完了順序", () => {
  it("先発の検索が後発より遅れて完了しても、最新の入力の結果を維持する", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    const oldData = new Promise((r) => {
      resolveOld = r;
    });
    const fakePagefind = {
      init: async () => {},
      search: async (term: string) => ({
        results: [{ data: () => (term === "old" ? oldData : page("NEWPAGE")) }],
      }),
    };
    const { type, results } = setup(fakePagefind);

    type("old");
    await flush();
    type("new");
    await flush();
    expect(results?.textContent).toContain("NEWPAGE");

    resolveOld({ url: "/old/", meta: { title: "OLDPAGE" }, excerpt: "" });
    await flush();

    expect(results?.textContent).toContain("NEWPAGE");
    expect(results?.textContent).not.toContain("OLDPAGE");
  });

  it("パレットを閉じた後に完了した検索が結果を描画しない", async () => {
    let resolveData: (v: unknown) => void = () => {};
    const pending = new Promise((r) => {
      resolveData = r;
    });
    const fakePagefind = {
      init: async () => {},
      search: async () => ({ results: [{ data: () => pending }] }),
    };
    const { type, results, window } = setup(fakePagefind);

    const toggle = () =>
      window.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "k", ctrlKey: true })
      );
    toggle();
    type("late");
    await flush();
    toggle();
    await flush();

    resolveData({ url: "/late/", meta: { title: "LATEPAGE" }, excerpt: "" });
    await flush();

    expect(results?.textContent).not.toContain("LATEPAGE");
  });
});
