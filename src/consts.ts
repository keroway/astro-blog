// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

import { BLOG_CATEGORY_LABELS } from "./lib/content-schema";

export const SITE_TITLE = "keroway.com";
export const SITE_DESCRIPTION =
  "横浜のソフトウェアエンジニア keroway の個人サイト。組み込みからクラウド、フロントエンドまで横断的に手を動かしてきた記録と、プロダクト・ツール・技術メモを置いています。最近は AI を活用した個人開発が中心です。";
export const SITE_AUTHOR = "keroway";

// サイトのメジャー改修世代を示す通巻番号。年では繰り上がらない。
// レイアウトやテーマの大規模刷新の節目で更新する。
export const SITE_VOLUME = "III";

/** category 値を表示用ラベルへ変換する。未知の値はそのまま返す。 */
export function categoryLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return (BLOG_CATEGORY_LABELS as Record<string, string>)[value] ?? value;
}
