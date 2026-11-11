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
