import { describe, expect, it } from "vitest";
import { assertDescriptionLength } from "./assert-description-length";

describe("assertDescriptionLength", () => {
  it("120文字は受理する", () => {
    expect(() =>
      assertDescriptionLength("あ".repeat(120), "a.md")
    ).not.toThrow();
  });

  it("121文字は拒否する", () => {
    expect(() => assertDescriptionLength("あ".repeat(121), "a.md")).toThrow(
      /a\.md.*120 文字を超えています.*121文字/
    );
  });
});
