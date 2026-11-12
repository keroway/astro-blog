// 二重引用符・単引用符どちらで書かれた description 行も対象にする。
// YAML の行末コメント（` # todo`）が付いていても書き換える。
const DESCRIPTION_LINE = /^description:[ \t]*(?:".*"|'.*')[ \t]*(?:#.*)?$/m;

// 先頭の frontmatter ブロック（開始 --- から次の --- 行まで）。
// 対象選定（stripBom 後）と揃えて先頭 BOM を許容し、置換後も BOM を保持する。
const FRONTMATTER = /^﻿?---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/;

export function replaceDescription(
  content: string,
  description: string
): string {
  const frontmatter = FRONTMATTER.exec(content)?.[0];
  if (frontmatter === undefined || !DESCRIPTION_LINE.test(frontmatter)) {
    throw new Error(
      "frontmatter 内に引用符付きの description 行が見つからず書き換えできませんでした"
    );
  }
  const replaced = frontmatter.replace(
    DESCRIPTION_LINE,
    () => `description: ${JSON.stringify(description)}`
  );
  return replaced + content.slice(frontmatter.length);
}
