import { describe, expect, it } from "vitest";
import {
  computeProblems,
  extractDocTableRows,
  parseCssBlock,
  stripBackticks,
} from "./lint-tokens-doc";

const CSS_FIXTURE = `[data-theme="light"] {
  --kw-ink-900: #1a1a1a;
  --kw-paper-50: #fdfdfd;
  /* ---- Semantic ---- */
  --kw-fg: var(--kw-ink-900);
  --kw-bg: var(--kw-paper-50);
}

[data-theme="dark"] {
  --kw-ink-900: #eaeaea;
  --kw-paper-50: #101010;
  /* ---- Semantic ---- */
  --kw-fg: var(--kw-ink-900);
  --kw-bg: var(--kw-paper-50);
}
`;

const DOC_FIXTURE_MATCHING = `### 1.1 プリミティブカラー

| トークン | light | dark |
| --- | --- | --- |
| \`--kw-ink-900\` | \`#1a1a1a\` | \`#eaeaea\` |
| \`--kw-paper-50\` | \`#fdfdfd\` | \`#101010\` |

### カラートークン（light / dark）

| トークン | light | dark |
| --- | --- | --- |
| \`--kw-ink-900\` | \`#1a1a1a\` | \`#eaeaea\` |
| \`--kw-paper-50\` | \`#fdfdfd\` | \`#101010\` |
| \`--kw-fg\` | \`var(--kw-ink-900)\` | \`var(--kw-ink-900)\` |
| \`--kw-bg\` | \`var(--kw-paper-50)\` | \`var(--kw-paper-50)\` |
`;

describe("stripBackticks", () => {
  it("前後のバッククォートを除去する", () => {
    expect(stripBackticks("`#1a1a1a`")).toBe("#1a1a1a");
  });

  it("バッククォートが無ければそのまま返す", () => {
    expect(stripBackticks("#1a1a1a")).toBe("#1a1a1a");
  });
});

describe("parseCssBlock", () => {
  it("light ブロックのトークンと Semantic マーカー行を抽出する", () => {
    const lines = CSS_FIXTURE.split("\n");
    const { tokens, semanticMarkerLine } = parseCssBlock(
      lines,
      '[data-theme="light"] {',
      "light"
    );
    expect(tokens.map((t) => t.name)).toEqual([
      "ink-900",
      "paper-50",
      "fg",
      "bg",
    ]);
    expect(semanticMarkerLine).toBeGreaterThan(0);
  });

  it("開始行が見つからないとき例外を投げる", () => {
    expect(() =>
      parseCssBlock(["no such block"], '[data-theme="light"] {', "light")
    ).toThrow();
  });
});

describe("extractDocTableRows", () => {
  it("指定した見出し配下のトークン行を抽出する", () => {
    const lines = DOC_FIXTURE_MATCHING.split("\n");
    const rows = extractDocTableRows(lines, /^### 1\.1 プリミティブカラー/);
    expect(rows.map((r) => r.name)).toEqual(["ink-900", "paper-50"]);
  });

  it("見出しが見つからないとき例外を投げる", () => {
    expect(() =>
      extractDocTableRows(["no such heading"], /^### 見つからない/)
    ).toThrow();
  });
});

describe("computeProblems", () => {
  it("tokens.css と doc が一致していれば問題なし", () => {
    const { problems } = computeProblems(CSS_FIXTURE, DOC_FIXTURE_MATCHING);
    expect(problems).toEqual([]);
  });

  it("doc 側にプリミティブトークンが欠落していると検出する", () => {
    const docMissing = DOC_FIXTURE_MATCHING.replace(
      "| `--kw-paper-50` | `#fdfdfd` | `#101010` |\n\n### カラートークン",
      "\n### カラートークン"
    );
    const { problems } = computeProblems(CSS_FIXTURE, docMissing);
    expect(
      problems.some(
        (p) => p.message.includes("--kw-paper-50") && p.message.includes("欠落")
      )
    ).toBe(true);
  });

  it("doc 側の値が tokens.css と不一致だと検出する", () => {
    const docMismatch = DOC_FIXTURE_MATCHING.replace(
      "| `--kw-ink-900` | `#1a1a1a` | `#eaeaea` |\n| `--kw-paper-50`",
      "| `--kw-ink-900` | `#000000` | `#eaeaea` |\n| `--kw-paper-50`"
    );
    const { problems } = computeProblems(CSS_FIXTURE, docMismatch);
    expect(
      problems.some(
        (p) =>
          p.message.includes("--kw-ink-900") &&
          p.message.includes("light 値が不一致")
      )
    ).toBe(true);
  });

  it("doc 側に余剰なトークンがあると検出する", () => {
    const docExtra = DOC_FIXTURE_MATCHING.replace(
      "### カラートークン（light / dark）",
      "### カラートークン（light / dark）\n\n"
    ).replace(
      "| `--kw-bg` | `var(--kw-paper-50)` | `var(--kw-paper-50)` |",
      "| `--kw-bg` | `var(--kw-paper-50)` | `var(--kw-paper-50)` |\n| `--kw-unknown` | `#fff` | `#000` |"
    );
    const { problems } = computeProblems(CSS_FIXTURE, docExtra);
    expect(
      problems.some(
        (p) => p.message.includes("--kw-unknown") && p.message.includes("余剰")
      )
    ).toBe(true);
  });

  it("Semantic マーカーが無い CSS では例外を投げる", () => {
    const cssNoMarker = CSS_FIXTURE.replace("/* ---- Semantic ---- */\n", "");
    expect(() => computeProblems(cssNoMarker, DOC_FIXTURE_MATCHING)).toThrow();
  });
});
