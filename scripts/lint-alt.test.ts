import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { altIssueReason, findAltIssues, isTargetRemoteHost } from "./lint-alt";

describe("isTargetRemoteHost", () => {
  it("imgur.com のホストを検出する", () => {
    expect(isTargetRemoteHost("https://imgur.com/abc.png")).toBe(true);
  });

  it("山括弧付きの URL でも検出する", () => {
    expect(isTargetRemoteHost("<https://i.imgur.com/abc.png>")).toBe(true);
    expect(
      isTargetRemoteHost("<https://lh3.googleusercontent.com/abc.png>")
    ).toBe(true);
    expect(isTargetRemoteHost("<https://example.com/abc.png>")).toBe(false);
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

  it("複数行にまたがる画像記法の短い alt・空 alt・外部ホストを元の行番号で検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-multiline.md");
    const content = [
      "![img](",
      "/sample.png",
      ")",
      "",
      "![](",
      "  ./empty.png",
      ")",
      "",
      "![説明文です](",
      "  https://i.imgur.com/a.png",
      '  "title"',
      ")",
      "",
      "![十分に長い説明文](",
      "  ./ok.png",
      ")",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => i.line)).toEqual([1, 5, 9]);
      expect(issues[0]).toMatchObject({ alt: "img", src: "/sample.png" });
      expect(issues[1]).toMatchObject({ alt: "" });
      expect(issues[2].reason).toBe(
        "外部ホスト画像（imgur/googleusercontent）"
      );
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("コードブロック・インラインコード内と空行をまたぐ記法は複数行でも検査しない", () => {
    const filePath = path.join(
      os.tmpdir(),
      "fixture-lint-alt-multiline-skip.md"
    );
    const content = [
      "```md",
      "![img](",
      "/sample.png",
      ")",
      "```",
      "",
      "`![img](` と /sample.png と `)`",
      "",
      "![img](",
      "",
      "/sample.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      expect(findAltIssues(filePath)).toEqual([]);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("山括弧付きの外部ホスト画像 (インライン / 参照定義) を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-angle.md");
    const content = [
      "![説明文です](<https://i.imgur.com/a.png>)",
      "",
      "![説明文です][fig]",
      "",
      "[fig]: <https://lh3.googleusercontent.com/b.png>",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => i.line)).toEqual([1, 3]);
      expect(issues[0].reason).toBe(
        "外部ホスト画像（imgur/googleusercontent）"
      );
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("空白を含む山括弧付きインラインパスの空 alt と外部ホスト画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-angle-space.md");
    const content = [
      "![](<./sample image.png>)",
      "",
      "![説明文です](<https://i.imgur.com/sample image.png>)",
      "",
      '![十分に長い説明文](<./ok image.png> "title")',
      "",
      "![十分に長い説明文](./ok.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => i.line)).toEqual([1, 3]);
      expect(issues[0]).toMatchObject({
        alt: "",
        src: "<./sample image.png>",
        reason: "alt が 4 文字未満",
      });
      expect(issues[1].reason).toBe(
        "外部ホスト画像（imgur/googleusercontent）"
      );
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

  it("参照ラベルの連続空白を正規化して照合する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-label-space.md");
    const content = [
      "![説明文です][Photo Label]",
      "",
      "![img][Photo  Label]",
      "",
      "[photo   label]: https://i.imgur.com/example.png",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => [i.line, i.reason])).toEqual([
        [1, "外部ホスト画像（imgur/googleusercontent）"],
        [3, "alt が 4 文字未満"],
      ]);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("重複した参照定義は描画と同じく最初の定義で検査する", () => {
    const run = (name: string, defs: string[]) => {
      const filePath = path.join(os.tmpdir(), name);
      fs.writeFileSync(
        filePath,
        ["![valid description][pic]", "", ...defs].join("\n"),
        "utf8"
      );
      try {
        return findAltIssues(filePath).map((i) => [i.line, i.reason]);
      } finally {
        fs.unlinkSync(filePath);
      }
    };
    expect(
      run("fixture-lint-alt-dup-ref-a.md", [
        "[pic]: https://i.imgur.com/a.png",
        "[pic]: /safe.png",
      ])
    ).toEqual([[1, "外部ホスト画像（imgur/googleusercontent）"]]);
    expect(
      run("fixture-lint-alt-dup-ref-b.md", [
        "[pic]: /safe.png",
        "[pic]: https://i.imgur.com/a.png",
      ])
    ).toEqual([]);
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

  it("リスト内コードフェンスの閉じフェンス後の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-list-fence.md");
    const content = [
      "- ```md",
      "  ![](/example.png)",
      "  ```",
      "",
      "![](/real.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 5, src: "/real.png" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("引用内コードフェンスの閉じフェンス後の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-quote-fence.md");
    const content = [
      "> ```md",
      "> ![](/example.png)",
      "> ```",
      "",
      "![](/real.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 5, src: "/real.png" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("インラインコード内の画像記法は誤検出しない", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-inline-code.md");
    const content = "`![](/sample.png)`";
    fs.writeFileSync(filePath, content, "utf8");
    try {
      expect(findAltIssues(filePath)).toHaveLength(0);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("インラインコードの外側にある実際の画像は検出する", () => {
    const filePath = path.join(
      os.tmpdir(),
      "fixture-lint-alt-inline-code-mixed.md"
    );
    const content =
      "`![](/sample.png)` の後に ![](../../assets/content/blog/a.png)";
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 1, alt: "" });
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

  it("alt 内に角括弧を含む外部ホスト画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-brackets.md");
    const content = [
      "![説明 [補足]](https://i.imgur.com/a.png)",
      "![[A] 説明 [B]](https://i.imgur.com/b.png)",
      "![説明 [補足]](../../assets/content/blog/a.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => [i.line, i.alt])).toEqual([
        [1, "説明 [補足]"],
        [2, "[A] 説明 [B]"],
      ]);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("alt 内で角括弧が 2 段以上入れ子でも外部ホスト画像を検出する", () => {
    const filePath = path.join(
      os.tmpdir(),
      "fixture-lint-alt-nested-brackets.md"
    );
    const content = [
      "![説明 [補足 [詳細]]](https://i.imgur.com/a.png)",
      "![説明 [補足 [詳細 [さらに]]]](https://i.imgur.com/b.png)",
      "![説明 [補足 [詳細]]](../../assets/content/blog/a.png)",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => [i.line, i.alt])).toEqual([
        [1, "説明 [補足 [詳細]]"],
        [2, "説明 [補足 [詳細 [さらに]]]"],
      ]);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("alt 内に角括弧を含む参照形式の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-brackets-ref.md");
    const content = [
      "![説明 [補足]][img]",
      "",
      "[img]: https://i.imgur.com/a.png",
    ].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues.map((i) => i.line)).toEqual([1]);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("閉じられていない引用内フェンスは引用の終了で終わり後続の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-quote-open.md");
    const content = ["> ~~~md", "> example", "", "![](/real.png)"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 4, src: "/real.png" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("閉じられていないリスト内フェンスはリストの終了で終わり後続の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-list-open.md");
    const content = ["- ~~~md", "  example", "", "![](/real.png)"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 4, src: "/real.png" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("リスト内フェンスの空行と字下げ行はコードとして扱い画像を無視する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-list-blank.md");
    const content = ["- ~~~md", "  a", "", "  ![](/example.png)", "  ~~~"].join(
      "\n"
    );
    fs.writeFileSync(filePath, content, "utf8");
    try {
      expect(findAltIssues(filePath)).toHaveLength(0);
    } finally {
      fs.unlinkSync(filePath);
    }
  });

  it("URL が次の行にある参照定義の画像を検出する", () => {
    const filePath = path.join(os.tmpdir(), "fixture-lint-alt-ref-nextline.md");
    const content = ["![img][pic]", "", "[pic]:", "  /real.png"].join("\n");
    fs.writeFileSync(filePath, content, "utf8");
    try {
      const issues = findAltIssues(filePath);
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({ line: 1, src: "/real.png" });
    } finally {
      fs.unlinkSync(filePath);
    }
  });
});
