import { describe, expect, it } from "vitest";
import { lineAt } from "./line-at.ts";

describe("lineAt", () => {
  const content = [
    "---",
    "title: テスト",
    "---",
    "",
    "最初の文章。",
    "![a](/a.png)",
    "次の文章。",
    "![b](/b.png)",
  ].join("\n");

  it("frontmatter を含む元ファイル基準の行番号で行を返す", () => {
    expect(lineAt(content, 6)).toBe("![a](/a.png)");
    expect(lineAt(content, 8)).toBe("![b](/b.png)");
  });

  it("CRLF の末尾 CR を取り除く", () => {
    expect(lineAt(content.replaceAll("\n", "\r\n"), 5)).toBe("最初の文章。");
  });

  it("範囲外は空文字列", () => {
    expect(lineAt(content, 0)).toBe("");
    expect(lineAt(content, 99)).toBe("");
  });
});
