import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readDescriptionLength } from "./lint-description-length";

function writeTempFile(content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "lint-description-"));
  const filePath = path.join(dir, "sample.mdoc");
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe("readDescriptionLength", () => {
  it("120文字以内の description は長さを返す", () => {
    const filePath = writeTempFile(
      '---\ntitle: "sample"\ndescription: "短い説明文"\n---\n本文'
    );
    expect(readDescriptionLength(filePath)).toBe(5);
  });

  it("120文字を超える description の長さを検出する", () => {
    const longDescription = "あ".repeat(125);
    const filePath = writeTempFile(
      `---\ntitle: "sample"\ndescription: "${longDescription}"\n---\n本文`
    );
    expect(readDescriptionLength(filePath)).toBe(125);
  });

  it("frontmatter が無いファイルは null を返す", () => {
    const filePath = writeTempFile("本文のみ");
    expect(readDescriptionLength(filePath)).toBeNull();
  });

  it("description フィールドが無い場合は null を返す", () => {
    const filePath = writeTempFile('---\ntitle: "sample"\n---\n本文');
    expect(readDescriptionLength(filePath)).toBeNull();
  });
});
