/**
 * コンテンツスキーマの共有定数
 *
 * Astro Content Collections スキーマ (src/content.config.ts)・
 * Sveltia CMS 設定 (public/admin/config.yml)・
 * 執筆補助スクリプト (scripts/suggest-frontmatter.ts) の三者が
 * 同じ列挙値を参照するための単一ソース。
 *
 * ⚠️ このモジュールは Node.js スクリプト / Vitest / Astro から共通利用するため、
 *    `astro:content` / `astro/zod` などのフレームワーク専用 API を import しないこと。
 */

// ──────────────────────────────────────────────────────────────────
// Blog カテゴリ
// ──────────────────────────────────────────────────────────────────

/** Astro schema / CMS / スクリプトで有効なブログカテゴリ値の一覧 */
export const BLOG_CATEGORIES = [
  "dev",
  "hardware",
  "tools",
  "reading",
  "event",
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

/** CMS 表示ラベル。public/admin/config.yml の options と一致させること */
export const BLOG_CATEGORY_LABELS: Record<BlogCategory, string> = {
  dev: "開発・プログラミング",
  hardware: "ハードウェア・電子工作",
  tools: "ツール・インフラ",
  reading: "読書",
  event: "イベント・参加記",
};

// ──────────────────────────────────────────────────────────────────
// Works ステータス
// ──────────────────────────────────────────────────────────────────

/** Astro schema / CMS で有効な Works ステータス値の一覧 */
export const WORKS_STATUSES = ["active", "archived", "wip"] as const;

export type WorksStatus = (typeof WORKS_STATUSES)[number];
