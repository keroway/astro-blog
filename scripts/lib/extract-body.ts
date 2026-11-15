import { stripBom } from "./strip-bom.ts";

const FRONTMATTER = /^---\r?\n(?:[\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/;

/**
 * frontmatter を除いた本文を返す。LF / CRLF / BOM 付きの入力に対応する。
 * 終了区切りは行頭の `---` のみ認識するので、本文中の水平線は欠落しない。
 */
export function extractBody(content: string): string {
  return stripBom(content).replace(FRONTMATTER, "").trim();
}
