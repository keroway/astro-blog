/**
 * 元ファイル全体を基準にした 1 始まりの行番号で 1 行を返す。範囲外は空文字列。
 * 行番号は `content.split("\n")` で採番されるため、frontmatter を除去した本文ではなく
 * 元の content を渡すこと。CRLF の末尾 `\r` は取り除く。
 */
export function lineAt(content: string, line: number): string {
  return (content.split("\n")[line - 1] ?? "").replace(/\r$/, "");
}
