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
  querySelectorAll(selector: string): { focus(): void }[];
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
    querySelectorAll() {
      return [];
    },
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
  const more = element();
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
        ".blog-search__more": more,
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

  return { input, clear, more, status, results };
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

describe("#832 BlogSearch の検索失敗時の表示", () => {
  it("検索が reject したらエラーを表示し、静的一覧を復元する", async () => {
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async () => {
        throw new Error("search failed");
      },
    };
    const { input, status, results } = setupDom(fakePagefind);

    input.value = "keyword";
    input.listeners.input();
    await flush();

    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe("検索に失敗しました");
    expect(results.innerHTML).toBe("");
    expect(results.hidden).toBe(true);
  });

  it("結果データ取得が reject しても同様にエラーを表示する", async () => {
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async () => ({
        results: [
          {
            data: () => Promise.reject(new Error("data failed")),
          },
        ],
      }),
    };
    const { input, status, results } = setupDom(fakePagefind);

    input.value = "keyword";
    input.listeners.input();
    await flush();

    expect(status.textContent).toBe("検索に失敗しました");
    expect(results.hidden).toBe(true);
  });

  it("古い検索の失敗が新しい検索の表示を変えない", async () => {
    let rejectOld: (e: unknown) => void = () => {};
    const oldSearch = new Promise((_, rej) => {
      rejectOld = rej;
    });
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: (term: string) =>
        term === "old"
          ? oldSearch
          : Promise.resolve({
              results: [
                {
                  data: () =>
                    Promise.resolve({
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

    rejectOld(new Error("old failed"));
    await flush();

    expect(status.textContent).toContain("new");
    expect(results.innerHTML).toContain("NEW");
    expect(results.hidden).toBe(false);
  });
});

describe("#895 BlogSearch の21件目以降の表示", () => {
  const hitsOf = (n: number, term: string) =>
    Array.from({ length: n }, (_, i) => ({
      data: () =>
        Promise.resolve({
          url: `/${term}/${i + 1}/`,
          meta: { title: `${term}-${i + 1}` },
          excerpt: "",
        }),
    }));
  const countArticles = (html: string) => html.split("<article").length - 1;

  it("初期は20件のみ描画し、もっと表示で21件目以降を追加する", async () => {
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async (term: string) => ({ results: hitsOf(45, term) }),
    };
    const { input, more, status, results } = setupDom(fakePagefind);

    input.value = "q";
    input.listeners.input();
    await flush();

    expect(countArticles(results.innerHTML)).toBe(20);
    expect(results.innerHTML).not.toContain("q-21<");
    expect(status.textContent).toContain("45 件");
    expect(status.textContent).toContain("20 件を表示");
    expect(more.hidden).toBe(false);

    more.listeners.click();
    await flush();
    expect(countArticles(results.innerHTML)).toBe(40);
    expect(results.innerHTML).toContain("q-21<");
    expect(more.hidden).toBe(false);

    more.listeners.click();
    await flush();
    expect(countArticles(results.innerHTML)).toBe(45);
    expect(status.textContent).not.toContain("を表示");
    expect(more.hidden).toBe(true);
  });

  it("20件以下ならもっと表示は出ない", async () => {
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async (term: string) => ({ results: hitsOf(20, term) }),
    };
    const { input, more } = setupDom(fakePagefind);

    input.value = "q";
    input.listeners.input();
    await flush();

    expect(more.hidden).toBe(true);
  });

  it("検索語を変えると表示範囲が先頭20件に戻る", async () => {
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async (term: string) => ({ results: hitsOf(45, term) }),
    };
    const { input, more, results } = setupDom(fakePagefind);

    input.value = "a";
    input.listeners.input();
    await flush();
    more.listeners.click();
    await flush();
    expect(countArticles(results.innerHTML)).toBe(40);

    input.value = "b";
    input.listeners.input();
    await flush();
    expect(countArticles(results.innerHTML)).toBe(20);
    expect(results.innerHTML).toContain("b-1<");
    expect(results.innerHTML).not.toContain("a-1<");
    expect(more.hidden).toBe(false);
  });

  it("クリアするともっと表示が隠れ、遅れて完了した追加取得が結果を復活させない", async () => {
    let resolveLate: (v: unknown) => void = () => {};
    const late = new Promise((r) => {
      resolveLate = r;
    });
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async () => ({
        results: [...hitsOf(20, "q"), { data: () => late }],
      }),
    };
    const { input, clear, more, status, results } = setupDom(fakePagefind);

    input.value = "q";
    input.listeners.input();
    await flush();
    more.listeners.click();
    await flush();

    clear.listeners.click();
    await flush();
    expect(more.hidden).toBe(true);

    resolveLate({ url: "/late/", meta: { title: "LATE" }, excerpt: "" });
    await flush();

    expect(results.innerHTML).toBe("");
    expect(status.hidden).toBe(true);
    expect(more.hidden).toBe(true);
  });

  it("#903 追加取得中に検索語を変えると、新検索完了前に旧追加取得が完了しても旧結果を描画しない", async () => {
    let resolveLate: (v: unknown) => void = () => {};
    const late = new Promise((r) => {
      resolveLate = r;
    });
    let resolveNew: (v: unknown) => void = () => {};
    const newSearch = new Promise((r) => {
      resolveNew = r;
    });
    const fakePagefind = {
      init: async () => {},
      debouncedSearch: async (term: string) =>
        term === "old"
          ? { results: [...hitsOf(20, "old"), { data: () => late }] }
          : newSearch,
    };
    const { input, more, status, results } = setupDom(fakePagefind);

    input.value = "old";
    input.listeners.input();
    await flush();
    more.listeners.click();
    await flush();

    input.value = "new";
    input.listeners.input();
    await flush();

    resolveLate({ url: "/late/", meta: { title: "LATE" }, excerpt: "" });
    await flush();
    expect(results.innerHTML).not.toContain("LATE");
    expect(countArticles(results.innerHTML)).toBe(20);
    expect(status.textContent).toContain("20 件を表示");

    resolveNew({ results: hitsOf(3, "new") });
    await flush();
    expect(results.innerHTML).toContain("new-1<");
    expect(results.innerHTML).not.toContain("LATE");
  });
});
