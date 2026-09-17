/**
 * UTF-8 BOM (EF BB BF) が付与されたファイル内容から BOM を除去する。
 * 先頭 BOM があると frontmatter 抽出の `/^---.../` 正規表現がマッチせず
 * silent skip するため、readFileSync 直後に必ず通す。
 */
export function stripBom(content: string): string {
  return content.replace(/^﻿/, "");
}
