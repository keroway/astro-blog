# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code, Codex, pi, etc.) when working with code in this repository. `AGENTS.md` in this repository is a symlink to this file.

## Claude Code セットアップ

`.claude/` 構成 (agents / commands / hooks の詳細な挙動) は **`.claude/README.md` が正典**。
**実装に着手する前に必ず** @.claude/rules/implementation.md を参照 (スコープ管理、Astro 7 固有の罠、検証順序などのルール)。

パス限定ルール (`.claude/rules/`、該当ファイルを触るターンだけ自動で載る):

- `pages.md` (`src/pages/**`) — 日本語スラグの encode パターン、新規ページ追加手順
- `content.md` (`src/content/**`, `src/content.config.ts`, `src/lib/content-schema.ts`) — Content Collections スキーマ、記事追加/スキーマ変更手順
- `ui.md` (`src/components/**`, `src/layouts/**`, `src/styles/**`) — 画像・スタイル・レイアウトコンポーネントの規約
- `testing.md` (`tests/**`, `src/lib/**`, `src/scripts/**`, vitest/playwright config) — unit/E2E テストの実行詳細
- `architecture.md` (`src/**`) — ディレクトリ構成の詳細
- `dev-environment.md` (`package.json`, `pnpm-workspace.yaml`, `vercel.json` 等) — dev サーバー/env var/サプライチェーン設定の詳細

## Development Commands

This project uses **pnpm** (version 11.27.1) as the package manager:

```bash
# Install dependencies
pnpm install

# Development server (portless 経由, https://keroway.localhost)
pnpm run dev       # or: pnpm start  (portless run --name keroway astro dev)
# portless を使わず素の astro dev を 4321 で起動したいとき:
pnpm run dev:astro

# Production build (includes type checking)
pnpm run build     # Runs: astro check && astro build

# Preview production build locally
pnpm run preview

# Unit tests (vitest)
pnpm run test:unit

# Playwright E2E tests (CRON_SECRET を CI と同値でセットする正規経路)
ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e

# Type check only
pnpm exec astro check

# CI のみで走る補助チェックのローカル実行 (要 build 済み dist/)
pnpm run test:lighthouse   # Lighthouse CI
pnpm run test:links        # lychee リンクチェック

# test:e2e に含まれる admin 系 spec だけを素早く回す部分実行 (dist 不要、CI 専用ではない)
pnpm run test:admin        # CMS admin スモーク + a11y
```

dev サーバー (portless/background 化の罠) / 環境変数 / pnpm サプライチェーン設定の詳細は `.claude/rules/dev-environment.md` を参照（`package.json` 等の config を触るターンに自動で載る）。

## Architecture Overview

This is a personal portfolio and technical blog (keroway.com) built with **Astro 7** + TypeScript, featuring:
- Japanese language support with URL-encoded slugs
- Content management via Astro Content Collections (Markdown/Markdoc)
- Responsive card-based blog listing with 16:9 aspect ratio images
- RSS feed and sitemap auto-generation
- Deployment on Vercel

Top-level: `assets/`(画像) `components/`(UI) `content/`(blog/works) `layouts/` `lib/` `pages/` `scripts/` `styles/` `types/` `consts.ts`。詳細なディレクトリツリーは `.claude/rules/architecture.md` を参照（`src/**` を触るターンに自動で載る）。**Routing:** top-level routing は `src/pages/`、view logic は `src/components/`、layout は `src/layouts/`。

## Critical: Japanese Slug Encoding Pattern

日本語スラグの `encodeURIComponent` パターン（`href` はエンコード、`getStaticPaths()` はエンコード不要）は `.claude/rules/pages.md` を参照（`src/pages/**` を触るターンに自動で載る）。

## Content Collections Schema

blog / works の frontmatter スキーマ詳細は `.claude/rules/content.md` を参照（`src/content/**` 等を触るターンに自動で載る）。Schema is defined in `src/content.config.ts` using Zod; category / status の enum は `src/lib/content-schema.ts`。

## Image Handling / Styling / Layout Components

`astro:assets` Image・`--kw-*` デザイントークン・`SiteLayout`/`BlogPost` の規約は `.claude/rules/ui.md` を参照（`src/components/**` / `src/layouts/**` / `src/styles/**` を触るターンに自動で載る）。

## Testing & Type Safety

- **Type checking:** Run `pnpm run build` to surface type errors and Astro validation issues
- Unit (vitest) / E2E (Playwright) の実行コマンド・ポート・対象範囲の詳細は `.claude/rules/testing.md` を参照（`tests/**` / `src/lib/**` / `src/scripts/**` 等を触るターンに自動で載る）
- **CI:** `.github/workflows/ci.yml` は 7 ジョブ — Lint (biome ci + lint:alt + lint:tokens-doc) / Unit tests (vitest) / Typecheck (astro check) / Build (astro build) / E2E (Playwright, build の dist を利用) / Lighthouse CI / Link check (lychee)。E2E・Lighthouse・Link check は `needs: [build]` で build 後に走り、それ以外は並列。ローカル再現できるのは前 5 つで、`/ship-check` が順に走らせる

## Deployment

- **Platform:** Vercel
- **Build command:** `corepack pnpm run build` (configured in `vercel.json`)
- **Install command:** `corepack pnpm install --frozen-lockfile`
- **Output:** `dist/` directory (static site generation)

## Coding Style & Conventions

- **Indentation:** 2 spaces
- **Component naming:** PascalCase for `.astro` components (`HeaderLink.astro`)
- **File naming:** kebab-case under `src/pages/` to match route paths
- **Constants:** camelCase or UPPER_CASE in `src/consts.ts`
- **Frontmatter fields:** kebab-case (e.g., `pub-date` becomes `pubDate` in schema)
- **TypeScript:** Strict mode enabled (`astro/tsconfigs/strict` with `strictNullChecks`)

## Commit & PR Guidelines

- **Commit style:** Short, imperative subjects (often in Japanese, e.g., `記事を追加`), under 50 characters
- **Before PR:** Confirm `pnpm run build` succeeds; manually verify pages render correctly
- **PR contents:** Concise summary, screenshots for visual changes, reproduction steps for bugs
- **Branch strategy:** Main branch is `main`

## Issue / PR Lifecycle

Issue の状態は GitHub ラベルで可視化する。複数の作業者 (人間 / エージェント) が並走するときの重複対応を防ぐためのもの。

| 状態 | ラベル | 遷移トリガー |
|------|--------|-------------|
| `open` | (なし) | Issue 起票時 |
| 対応中 | `in-progress` | 作業者が assignee 設定 + コメントで着手宣言したタイミングで付与 |
| レビュー中 | `in-review` | 関連 PR を open したタイミングで `in-progress` から差し替え |
| 完了 | (close) | PR マージ or 手動 close。`done` ラベルは設けず、close 状態で代替 |

着手前には必ず `gh issue view <番号>` で assignees と関連 PR の有無を確認し、重複対応を回避する。`gh issue edit <番号> --add-assignee @me --add-label "in-progress"` で着手を宣言してからブランチを切る。

## Common Development Tasks

ブログ記事追加・Content Collections スキーマ変更・frontmatter 候補提示の手順は `.claude/rules/content.md`、新規ページ追加は `.claude/rules/pages.md`、グローバルスタイル更新は `.claude/rules/ui.md` を参照（対象パスを触るターンに自動で載る）。

## Key Integrations

- **@astrojs/markdoc:** Markdoc (`.mdoc`) rendering for blog / works content
- **@astrojs/rss:** RSS feed generation at `/rss.xml` (+ `/feed.xml`, `/works/rss.xml`)
- **@astrojs/sitemap:** Auto-generated XML sitemap (admin / api は除外)
- **UnoCSS (`@unocss/astro`):** presetWind4 + `kw-*` shortcuts (`uno.config.ts`)
- **Pagefind:** 全文検索。`astro.config.mjs` 内の自前インライン統合 `pagefind-inline` が build 後にインデックス生成 (ADR 0015)
- **Sveltia CMS (`@sveltia/cms`):** `/admin` の Git ベース CMS (ADR 0016)
- **@astrojs/vercel:** Vercel adapter (静的生成 + `/api/trigger-build` のみ on-demand)
- **Playwright / vitest:** E2E / unit テストフレームワーク

## Locale & Accessibility

- **Default language:** Japanese (`ja`)
- **OGP locale:** Auto-set to `ja_JP` in BaseHead.astro
- **Accessibility:** ARIA labels on navigation, `rel` attributes on external links, `prefers-reduced-motion` support
- **Web fonts:** Shippori Mincho [500] + BIZ UDPGothic [400,700] + JetBrains Mono [400,500] を Astro fonts API (`fontProviders.fontsource()`, `astro.config.mjs`) で自己ホスト配信 (ADR 0013)。Google Fonts への外部リクエストは発生しない。Zen Maru Gothic (`@fontsource/zen-maru-gothic`) は OG 画像生成 (satori) 専用で、ページテキストには使わない。

## Codex 向け運用ルール

Codex 向けの横断運用ルールは `keroway/CLAUDE.md` ではなく
[agent-assets `docs/codex-common-instructions.md`](https://github.com/keroway/agent-assets/blob/main/docs/codex-common-instructions.md)
を正典とする（Codex は git ルートより上の AGENTS.md を読まないため）。
