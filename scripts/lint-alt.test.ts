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

  it("参照形式の画像 (![][ref] + [ref]: url) を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-reference.md");
    const content = ["![][figure]", "", "[figure]: /sample.png"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        line: 1,
        alt: "",
        src: "/sample.png",
        reason: "alt が 4 文字未満",
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("ショートカット参照形式 (![label] + [label]: url) を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-shortcut.md");
    const content = ["![img]", "", "[img]: /sample.png"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        line: 1,
        alt: "img",
        src: "/sample.png",
        reason: "alt が 4 文字未満",
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("シングルクォートの title を持つ画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-single-title.md");
    const content = "![](../../assets/content/blog/a.png 'title')";
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        line: 1,
        alt: "",
        reason: "alt が 4 文字未満",
      });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("fenced code block 内の画像記法は無視する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-code.md");
    const content = ["```md", "![](/sample.png)", "```"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      expect(findAltIssues(filePath)).toHaveLength(0);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("入れ子のフェンス (4文字フェンス内の3文字フェンス) の後の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-nested-fence.md");
    const content = [
      "````markdown",
      "```",
      "````",
      "",
      "![](/sample.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 5, alt: "" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("末尾に文字が続くフェンス行を閉じフェンスと誤認せず後続の画像を検出する", () => {
    const filePath = path.join(
      os.tmpdir(),
      "fixture-lint-alt-fence-with-text.md"
    );
    const content = [
      "```text",
      "```not-a-closing-fence",
      "```",
      "",
      "![](/sample.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 5, alt: "" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("fenced code block の外側は通常どおり検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-mixed.md");
    const content = [
      "```md",
      "![](/sample.png)",
      "```",
      "",
      "![img](../../assets/content/blog/a.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 5, alt: "img" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
