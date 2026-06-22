// Place any global data in this file.
// You can import this data from anywhere in your site by using the `import` keyword.

export const SITE_TITLE = "keroway.com";
export const SITE_DESCRIPTION =
  "横浜のソフトウェアエンジニア keroway の個人サイト。組み込みからクラウド、フロントエンドまで横断的に手を動かしてきた記録と、プロダクト・ツール・技術メモを置いています。";
export const SITE_AUTHOR = "keroway";

// サイトのメジャー改修世代を示す通巻番号。年では繰り上がらない。
// レイアウトやテーマの大規模刷新の節目で更新する。
export const SITE_VOLUME = "III";

// ブログのカテゴリ（大分類）。keystatic.config.ts の category select と一致させる。
// 値（保存キー）→ 表示ラベルの対応表。表示箇所は categoryLabel() 経由で参照する。
export const BLOG_CATEGORIES = {
  dev: "開発・プログラミング",
  hardware: "ハードウェア・電子工作",
  tools: "ツール・インフラ",
  reading: "読書",
  event: "イベント・参加記",
} as const;

export type BlogCategory = keyof typeof BLOG_CATEGORIES;

/** category 値を表示用ラベルへ変換する。未知の値はそのまま返す。 */
export function categoryLabel(value?: string): string | undefined {
  if (!value) return undefined;
  return (BLOG_CATEGORIES as Record<string, string>)[value] ?? value;
}
