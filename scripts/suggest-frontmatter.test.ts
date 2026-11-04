import { describe, expect, it } from "vitest";
import { MAX_DESCRIPTION_LENGTH } from "./lint-description-length";
import { isValidSuggestedDescription, SCHEMA } from "./suggest-frontmatter";

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
