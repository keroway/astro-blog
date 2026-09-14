/**
 * #746 回帰テスト: BlogSearch の非同期検索が入力順と逆順に完了しても、
 * 最新の入力に対応する結果だけが DOM に反映されることを確認する。
 *
 * src/components/BlogSearch.astro の <script> をそのまま抽出して VM 上で実行し、
 * Pagefind の debouncedSearch / data() をスタブ化して完了順序を制御する。
 * (astro:content 等のビルド依存が無いスクリプトのため、実コードを直接検証できる)
 */

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { describe, expect, it } from "vitest";

type Stub = {
  hidden: boolean;
  disabled: boolean;
  value: string;
  textContent: string;
  innerHTML: string;
  dataset: Record<string, string>;
  listeners: Record<string, () => void>;
  addEventListener(type: string, fn: () => void): void;
  focus(): void;
};

function element(): Stub {
  return {
    hidden: true,
    disabled: true,
    value: "",
    textContent: "",
    innerHTML: "",
    dataset: {},
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
    focus() {},
  };
}

function compileScript(): string {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../src/components/BlogSearch.astro"),
    "utf8"
  );
  const scriptBody = source.split("<script>")[1]?.split("</script>")[0];
  if (!scriptBody)
    throw new Error("BlogSearch.astro の <script> が見つからない");
  return ts
    .transpileModule(scriptBody, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    })
    .outputText.replace(
      /import\([\s\S]*?pagefindPath\s*\)/,
      "Promise.resolve(fakePagefind)"
    );
}

const flush = () => new Promise((r) => setImmediate(r));

function setupDom(fakePagefind: unknown) {
  const input = element();
  const clear = element();
  const status = element();
  const results = element();
  const filter = element();
  const posts = element();
  const root = element() as Stub & {
    querySelector: (s: string) => Stub | null;
  };
  root.querySelector = (s: string) =>
    (
      ({
        ".blog-search__input": input,
        ".blog-search__clear": clear,
        ".blog-search__status": status,
        ".blog-search__results": results,
      }) as Record<string, Stub>
    )[s] ?? null;

  const context = {
    document: {
      querySelector: (s: string) =>
        s === "[data-blog-search]" ? root : filter,
      getElementById: () => posts,
      addEventListener() {},
    },
    fakePagefind,
    setImmediate,
  };
  vm.createContext(context);
  vm.runInContext(compileScript(), context);

  return { input, clear, status, results };
}

describe("#746 BlogSearch の非同期検索の完了順序", () => {
  it("後発の検索より先発の検索データが遅れて完了しても、最新の入力に対応する結果を維持する", async () => {
    let resolveOld: (v: unknown) => void = () => {};
    const oldData = new Promise((r) => {
      resolveOld = r;
    });
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async (term: string) => ({
        results: [
          {
            data: () =>
              term === "old"
                ? oldData
                : Promise.resolve({
                    url: "/new/",
                    meta: { title: "NEW" },
                    excerpt: "",
                  }),
          },
        ],
      }),
    };

    const { input, status, results } = setupDom(fakePagefind);

    input.value = "old";
    input.listeners.input();
    await flush();

    input.value = "new";
    input.listeners.input();
    await flush();

    expect(results.innerHTML).toContain("NEW");
    expect(status.textContent).toContain("new");

    resolveOld({ url: "/old/", meta: { title: "OLD" }, excerpt: "" });
    await flush();

    // 遅れて完了した「old」の検索データが、既に表示済みの「new」の結果を上書きしないこと。
    expect(input.value).toBe("new");
    expect(status.textContent).toContain("new");
    expect(results.innerHTML).not.toContain("OLD");
    expect(results.innerHTML).toContain("NEW");
  });

  it("検索処理中にクリアすると、後から完了したデータが検索状態を復活させない", async () => {
    let resolveData: (v: unknown) => void = () => {};
    const pending = new Promise((r) => {
      resolveData = r;
    });
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async () => ({
        results: [{ data: () => pending }],
      }),
    };

    const { input, clear, status, results } = setupDom(fakePagefind);

    input.value = "keyword";
    input.listeners.input();
    await flush();

    clear.listeners.click();
    await flush();

    expect(status.hidden).toBe(true);
    expect(results.innerHTML).toBe("");

    resolveData({ url: "/late/", meta: { title: "LATE" }, excerpt: "" });
    await flush();

    // クリア後に遅れて完了したデータが結果を復活させないこと。
    expect(status.hidden).toBe(true);
    expect(results.innerHTML).toBe("");
  });
});
