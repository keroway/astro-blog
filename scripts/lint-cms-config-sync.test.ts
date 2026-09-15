import { describe, expect, it } from "vitest";
import { computeProblems } from "./lint-cms-config-sync";

const CONFIG_FIXTURE = `
collections:
  - name: blog
    fields:
      - name: category
        widget: select
        options:
          - { label: "開発", value: dev }
          - { label: "ツール", value: tools }
  - name: works
    fields:
      - name: status
        widget: select
        options:
          - { label: "公開中", value: active }
          - { label: "作業中", value: wip }
`;

describe("computeProblems", () => {
  it("スキーマと config.yml の選択肢が一致していれば問題を検出しない", () => {
    const problems = computeProblems(
      CONFIG_FIXTURE,
      ["dev", "tools"],
      ["active", "wip"]
    );
    expect(problems).toEqual([]);
  });

  it("スキーマにあり config.yml に無い値を欠落として検出する", () => {
    const problems = computeProblems(
      CONFIG_FIXTURE,
      ["dev", "tools", "reading"],
      ["active", "wip"]
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("reading");
    expect(problems[0]?.message).toContain("欠落");
  });

  it("config.yml にありスキーマに無い値を余剰として検出する", () => {
    const problems = computeProblems(
      CONFIG_FIXTURE,
      ["dev"],
      ["active", "wip"]
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toContain("tools");
    expect(problems[0]?.message).toContain("余剰");
  });

  it("フィールド自体が見つからない場合を検出する", () => {
    const problems = computeProblems(
      "collections:\n  - name: blog\n    fields: []\n",
      ["dev"],
      ["active"]
    );
    expect(problems.length).toBeGreaterThanOrEqual(1);
    expect(problems.some((p) => p.message.includes("category"))).toBe(true);
  });
});
