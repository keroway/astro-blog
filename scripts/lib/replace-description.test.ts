import { describe, expect, it } from "vitest";
import { replaceDescription } from "./replace-description";

describe("replaceDescription", () => {
  it.each([
    ['description: ""', "二重引用符の空文字"],
    ["description: ''", "単引用符の空文字"],
  ])("%s (%s) を生成結果で更新する", (line) => {
    const content = `---\ntitle: Test\n${line}\n---\n本文\n`;
    expect(replaceDescription(content, "概要です")).toBe(
      '---\ntitle: Test\ndescription: "概要です"\n---\n本文\n'
    );
  });

  it("description 内の $ を置換パターンとして解釈しない", () => {
    const content = "---\ndescription: ''\n---\n";
    expect(replaceDescription(content, "価格は$&です")).toBe(
      '---\ndescription: "価格は$&です"\n---\n'
    );
  });

  it("description 行が無ければエラーにする", () => {
    expect(() => replaceDescription("---\ntitle: Test\n---\n", "x")).toThrow();
  });
});
