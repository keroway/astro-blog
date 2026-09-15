import { describe, expect, it } from "vitest";
import { timingSafeEqualString } from "./timing-safe-equal";

describe("timingSafeEqualString", () => {
  it("同じ文字列は true", () => {
    expect(timingSafeEqualString("Bearer secret", "Bearer secret")).toBe(true);
  });

  it("長さが同じで内容が異なる文字列は false", () => {
    expect(timingSafeEqualString("Bearer secret1", "Bearer secret2")).toBe(
      false
    );
  });

  it("長さが異なる文字列は false (ダミー比較分岐)", () => {
    expect(timingSafeEqualString("Bearer short", "Bearer much-longer")).toBe(
      false
    );
  });

  it("空文字列同士は true", () => {
    expect(timingSafeEqualString("", "")).toBe(true);
  });

  it("空文字列と非空文字列は false", () => {
    expect(timingSafeEqualString("", "Bearer secret")).toBe(false);
  });
});
