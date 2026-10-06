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
  const status = window.document.getElementById(
    "command-palette-status"
  ) as HTMLElement | null;
  return { type, results, status, input, window };
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

describe("#847 CommandPalette を開いたままのページ遷移", () => {
  it("開いたまま DOM が交換されても、遷移先の最初の Ctrl+K で開く", () => {
    const { window } = setup({
      init: async () => {},
      search: async () => ({ results: [] }),
    });
    const doc = window.document;
    const initialHtml = doc.body.innerHTML;
    const toggle = () =>
      window.dispatchEvent(
        new window.KeyboardEvent("keydown", { key: "k", ctrlKey: true })
      );
    const root = () =>
      doc.getElementById("command-palette") as unknown as HTMLElement;

    toggle();
    expect(root().hidden).toBe(false);

    doc.dispatchEvent(new window.Event("astro:before-swap"));
    doc.body.innerHTML = initialHtml;
    doc.dispatchEvent(new window.Event("astro:page-load"));
    expect(root().hidden).toBe(true);

    toggle();
    expect(root().hidden).toBe(false);
  });
});

describe("#848 CommandPalette の一時的な検索失敗からの回復", () => {
  it("search が一度失敗しても次の入力で再検索し、通知を解除する", async () => {
    let calls = 0;
    const fakePagefind = {
      init: async () => {},
      search: async () => {
        calls += 1;
        if (calls === 1) throw new Error("transient");
        return { results: [{ data: () => page("RECOVERED") }] };
      },
    };
    const { type, results, status } = setup(fakePagefind);

    type("first");
    await flush();
    expect(status?.hidden).toBe(false);

    type("second");
    await flush();
    expect(calls).toBe(2);
    expect(results?.textContent).toContain("RECOVERED");
    expect(status?.hidden).toBe(true);
  });

  it("結果 data の取得だけが失敗しても次の入力で回復する", async () => {
    let calls = 0;
    const fakePagefind = {
      init: async () => {},
      search: async () => {
        calls += 1;
        return {
          results: [
            {
              data: () =>
                calls === 1
                  ? Promise.reject(new Error("transient"))
                  : page("RECOVERED"),
            },
          ],
        };
      },
    };
    const { type, results, status } = setup(fakePagefind);

    type("first");
    await flush();
    expect(status?.hidden).toBe(false);

    type("second");
    await flush();
    expect(results?.textContent).toContain("RECOVERED");
    expect(status?.hidden).toBe(true);
  });

  it("init の失敗は固定扱いで、以後 search を呼ばず縮退を維持する", async () => {
    let searchCalls = 0;
    const fakePagefind = {
      init: async () => {
        throw new Error("init failed");
      },
      search: async () => {
        searchCalls += 1;
        return { results: [] };
      },
    };
    const { type, status } = setup(fakePagefind);

    type("first");
    await flush();
    type("second");
    await flush();
    expect(searchCalls).toBe(0);
    expect(status?.hidden).toBe(false);
  });
});
