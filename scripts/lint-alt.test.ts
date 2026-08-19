import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { altIssueReason, findAltIssues, isTargetRemoteHost } from "./lint-alt";

describe("isTargetRemoteHost", () => {
  it("imgur.com のホストを検出する", () => {
    expect(isTargetRemoteHost("https://imgur.com/abc.png")).toBe(true);
  });

  it("imgur.com のサブドメインを検出する", () => {
    expect(isTargetRemoteHost("https://i.imgur.com/abc.png")).toBe(true);
  });

  it("googleusercontent.com のホストを検出する", () => {
    expect(
      isTargetRemoteHost("https://lh3.googleusercontent.com/abc.png")
    ).toBe(true);
  });

  it("対象外のホストは検出しない", () => {
    expect(isTargetRemoteHost("https://example.com/abc.png")).toBe(false);
  });

  it("相対パスは対象外", () => {
    expect(isTargetRemoteHost("../../assets/content/blog/xxx.png")).toBe(false);
  });

  it("不正な URL は対象外", () => {
    expect(isTargetRemoteHost("https://")).toBe(false);
  });
});

describe("altIssueReason", () => {
  const src = "../../assets/content/blog/xxx.png";

  it("4文字未満の alt を検出する", () => {
    expect(altIssueReason("abc", src)).toBe("alt が 4 文字未満");
  });

  it("空の alt を検出する", () => {
    expect(altIssueReason("", src)).toBe("alt が 4 文字未満");
  });

  it("プレースホルダ alt を検出する (大文字小文字を無視)", () => {
    expect(altIssueReason("Image", src)).toBe("プレースホルダ alt");
    expect(altIssueReason("enter image description here", src)).toBe(
      "プレースホルダ alt"
    );
  });

  it("数値のみの alt を検出する", () => {
    expect(altIssueReason("12345", src)).toBe("数値のみの alt");
  });

  it("imgur / googleusercontent ホストを検出する", () => {
    expect(
      altIssueReason("十分に長い説明文", "https://imgur.com/abc.png")
    ).toBe("外部ホスト画像（imgur/googleusercontent）");
  });

  it("問題のない alt は null を返す", () => {
    expect(altIssueReason("十分に長い説明文", src)).toBeNull();
  });
});

describe("findAltIssues", () => {
  it("問題のある画像参照を行番号付きで検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt.md");
    const content = [
      "# タイトル",
      "",
      "![img](../../assets/content/blog/a.png)",
      "",
      "![十分に長い説明文](../../assets/content/blog/b.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        line: 3,
        alt: "img",
        reason: "alt が 4 文字未満",
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
