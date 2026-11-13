import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION_LENGTH } from "./lint-description-length";
import {
  isValidSuggestedDescription,
  parseFrontmatter,
  SCHEMA,
} from "./suggest-frontmatter";

describe("suggest-frontmatter parseFrontmatter tags", () => {
  it("ブロック形式のタグを読む", () => {
    const fm = parseFrontmatter(
      "---\ntitle: T\ntags:\n  - Rust\n  - Web\n---\n本文"
    );
    expect(fm.tags).toEqual(["Rust", "Web"]);
  });

  it("角括弧形式のタグを読む", () => {
    const fm = parseFrontmatter(
      '---\ntitle: T\ntags: ["読書", プログラミング]\n---\n'
    );
    expect(fm.tags).toEqual(["読書", "プログラミング"]);
  });

  it("タグ未設定なら tags は undefined", () => {
    const fm = parseFrontmatter("---\ntitle: T\ncategory: dev\n---\n");
    expect(fm.tags).toBeUndefined();
    expect(fm.category).toBe("dev");
  });
});

describe("suggest-frontmatter description 制約", () => {
  it("スキーマの maxLength が記事スキーマの上限と一致する", () => {
    expect(SCHEMA.properties.description.maxLength).toBe(
      MAX_DESCRIPTION_LENGTH
    );
  });

  it("120文字を受理し121文字を拒否する", () => {
    expect(isValidSuggestedDescription("あ".repeat(120))).toBe(true);
    expect(isValidSuggestedDescription("あ".repeat(121))).toBe(false);
  });

  it("50文字を受理し49文字を拒否する", () => {
    expect(isValidSuggestedDescription("あ".repeat(50))).toBe(true);
    expect(isValidSuggestedDescription("あ".repeat(49))).toBe(false);
  });
});

describe("suggest-frontmatter CLI 起動経路", () => {
  const run = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--experimental-strip-types", "scripts/suggest-frontmatter.ts", ...args],
      { encoding: "utf8" }
    );

  it("引数なしで module 解決に失敗せず Usage を表示する", () => {
    const r = run();
    expect(r.stderr).not.toContain("ERR_MODULE_NOT_FOUND");
    expect(r.stderr).toContain("Usage:");
    expect(r.status).toBe(1);
  });

  it("存在しない記事ではファイル未検出を報告する", () => {
    const r = run("src/content/blog/__no-such-article__.mdoc");
    expect(r.stderr).toContain("ファイルが見つかりません");
    expect(r.status).toBe(1);
  });
});
