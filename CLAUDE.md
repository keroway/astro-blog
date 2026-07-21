# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code セットアップ

このリポジトリは Claude Code 用に次の構成を持つ。**実装に着手する前に必ず参照する。**

- **詳細な実装方針:** @.claude/rules/implementation.md (スコープ管理、Astro 7 固有の罠、検証順序などのルール)
- **サブエージェント:**
  - `web-designer` — UI/UX 改善・新規ページ設計 (`docs/design-system.md` 準拠、Playwright MCP でスクリーンショット比較可)
  - `web-director` — 要件/アーキテクチャ判断、PR スコープ管理、ADR 起票判断
- **スラッシュコマンド:**
  - `/ship-check [pw filter]` — CI のうちローカル再現可能な 5 ジョブ (lint / unit / typecheck / build / playwright) と同じコマンドを順に走らせる PR 直前ゲート。build は `astro check` 込みの `pnpm run build` ではなく `astro build` 直叩きで、CI と同じ並列構成を再現する (Lighthouse / Link check は CI のみ)。
  - `/fix-ci <PR番号>` — 指定 PR の落ちた CI ログを `gh` で取得して修正に当たる (PR 番号は必ず明示)
- **自動 hook:**
  - `PostToolUse` (`Edit | Write | MultiEdit`) 直後に `.claude/hooks/format-on-write.sh` が走り、対象拡張子 (`.ts/.tsx/.js/.jsx/.mjs/.cjs/.json`) は Biome で format される。`.astro` / `.md` / `.css` は対象外。
  - `SessionEnd` hook として `.claude/hooks/stop-dev-server.sh` を **`.claude/settings.json` に登録済み** (セッション中に立ち上げた `astro dev` を cwd スコープで停止＝立ちっぱなし防止、共有 portless proxy デーモンは残す)。

## Development Commands

This project uses **pnpm** (version 11.1.3) as the package manager:

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
pnpm run test:admin        # CMS admin スモーク + a11y
```

**Astro 7 の dev 自動 background 化:** Astro 7 は AI コーディングエージェントを検出すると `astro dev` を自動でデタッチした background プロセスとして起動する (lock file: `.astro/dev.json`)。Playwright の webServer がこれを「早期終了」と誤認して落ちるため、エージェントセッションからの E2E 実行は `ASTRO_DEV_BACKGROUND=0` を付ける。残留デーモンは `pnpm exec astro dev status` / `astro dev stop` で確認・停止。

**Dev サーバー (portless):** `pnpm dev` / `pnpm start` は [portless](https://github.com/vercel-labs/portless) 経由で `astro dev` を起動し、固定ポート 4321 ではなく `https://keroway.localhost` で配信する (内部はランダムポート割当でポート競合が消える)。HTTPS 構成のため**初回のみ** CA 信頼登録と 443 バインドで sudo 昇格が走る (`portless trust` / proxy 起動)。proxy は port 443 の常駐デーモンで、プロジェクト横断の共有ルーター。セッション終了時の停止は SessionEnd hook (下記、要登録) が担い、`astro dev` 本体だけを止めて proxy は残す。portless を使わず素の `astro dev` を 4321 で動かしたいときは `pnpm dev:astro`。

**Important:** `pnpm-workspace.yaml` で `esbuild` / `sharp` の build スクリプトは `allowBuilds: false` (v10 までの `ignoredBuiltDependencies` 相当) で無効化。`overrides` / `peerDependencyRules` も pnpm 11 の正規場所として `pnpm-workspace.yaml` に集約 (v10 までは `package.json#pnpm` 配下)。pnpm 11 のサプライチェーン保護 (`minimumReleaseAge=1440`, `strictDepBuilds=true`, `blockExoticSubdeps=true`) はデフォルト有効、追加で `minimumReleaseAgeStrict: true` を設定済み。`.npmrc` は registry のみで、制約のある環境では `COREPACK_NPM_REGISTRY` を併設する。

## Architecture Overview

This is a personal portfolio and technical blog (keroway.com) built with **Astro 7** + TypeScript, featuring:
- Japanese language support with URL-encoded slugs
- Content management via Astro Content Collections (Markdown/Markdoc)
- Responsive card-based blog listing with 16:9 aspect ratio images
- RSS feed and sitemap auto-generation
- Deployment on Vercel

### Directory Structure

```
src/
├── assets/content/       # blog / works 用の画像アセット (astro:assets 経由)
├── components/           # 再利用 UI 全 28 個: BaseHead, Header, Footer, SectionHead,
│                         #   FocusCard, PostRow, WorksCard, TableOfContents, A11yMenu,
│                         #   BlogSearch, CommandPalette, HeroBackdrop ほか
├── content/
│   ├── blog/            # Markdown/Markdoc blog posts (約 60 記事)
│   └── works/           # Markdown/Markdoc entries for portfolio/projects
├── content.config.ts    # Content Collections schema for blog / works
├── data/                # focus-areas.ts などの静的データ
├── layouts/
│   ├── SiteLayout.astro       # Main page wrapper with Header/Footer
│   ├── BlogPost.astro         # Blog post layout with image optimization
│   └── WorkEntryLayout.astro  # Works entry layout
├── lib/                 # content.ts / content-schema.ts / slug.ts (+ 各 *.test.ts)
├── pages/
│   ├── index.astro            # Homepage (hero, recent posts, focus areas)
│   ├── about.astro / now.astro / colophon.astro / 404.astro
│   ├── admin.astro            # Sveltia CMS (/admin)
│   ├── api/trigger-build.ts   # 公開予約ビルドの on-demand エンドポイント
│   ├── blog/
│   │   ├── [...page].astro    # Blog listing (ページネーション付きカードグリッド)
│   │   ├── [...slug].astro    # Dynamic blog post routes
│   │   └── tags/              # index.astro / [tag].astro
│   ├── og/[...slug].png.ts    # OGP 画像生成 (satori + resvg)
│   ├── works/                 # index.astro / [slug].astro / rss.xml.js
│   ├── rss.xml.js / feed.xml.js / llms.txt.ts
├── scripts/             # クライアント JS (font-size, reduce-motion など)
├── styles/
│   ├── tokens.css       # `--kw-*` デザイントークン
│   └── global.css       # ベース要素スタイル、typography
├── types/               # content.ts (型定義)
└── consts.ts            # SITE_TITLE, SITE_DESCRIPTION
```

**Routing Logic:** Keep top-level routing in `src/pages/`, delegate view logic to `src/components/`. Layout wrappers belong in `src/layouts/`.

## Critical: Japanese Slug Encoding Pattern

Astro 7 の Content Layer API では `post.id` がスラグ（ファイル名から拡張子を除いたもの）になります。`post.id` には日本語文字が含まれるため、HTML の `href` 属性では `encodeURIComponent` が必要ですが、`getStaticPaths()` のパラメータでは**エンコード不要**です（Astro が内部処理）。

1. **Blog post routes** (`src/pages/blog/[...slug].astro`):
   ```typescript
   export async function getStaticPaths() {
     const posts = await getCollection('blog');
     return posts.map((post) => ({
       params: { slug: post.id },  // エンコード不要
       props: post,
     }));
   }
   ```

2. **Blog listing** (`src/pages/blog/[...page].astro`):
   ```typescript
   const encodedSlug = post.id.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   // Used in: <a href={`/blog/${encodedSlug}/`}>
   ```

3. **Homepage and RSS feed** (`src/pages/index.astro`, `src/pages/rss.xml.js`):
   ```typescript
   const encodedSlug = post.id.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   ```

**Why:** HTML の `href` 属性では非ASCII文字をパーセントエンコードする必要がある。`getStaticPaths()` でエンコードすると Astro が二重デコードして 404 になるため、`href` のみエンコードする。

## Content Collections Schema

Blog posts in `src/content/blog/` must include this frontmatter:

```yaml
---
title: "Article Title"              # Required
description: "Short summary"        # Required
pubDate: 2024-01-15                # Required (coerced to Date)
updatedDate: 2024-01-20            # Optional
category: "Cloud & DevOps"         # Optional (BLOG_CATEGORIES の enum、src/lib/content-schema.ts)
tags: ["astro", "vercel"]          # Optional (string[])
series: "シリーズ名"                # Optional
heroImage: ../../assets/content/blog/xxx.png  # Optional (image()、ローカルアセット参照)
ogImage: "/og/custom.png"          # Optional
author: "keroway"                  # Optional
canonicalUrl: "https://..."        # Optional (URL)
draft: true                        # Optional (default false、true で非公開)
---
```

Schema is defined in `src/content.config.ts` using Zod (imported from `astro/zod`); category / status の enum は `src/lib/content-schema.ts` に定義。New fields require schema updates.

Works entries in `src/content/works/` use a separate collection with:

```yaml
---
title: "Project Name"                   # Required
description: "Short summary"            # Required
status: "active"                        # Required: active | archived | wip (WORKS_STATUSES)
lpUrl: "https://..."                    # Required: landing page / external intro
repoUrl: "https://github.com/..."       # Optional
demoUrl: "https://..."                  # Optional
heroImage: ../../assets/content/works/xxx.png  # Optional (image())
tags: ["Astro", "TypeScript"]           # Required
createdAt: 2026-05-10                   # Required (coerced to Date)
updatedAt: 2026-05-10                   # Optional
featured: true                          # Optional, defaults to false
---
```

`works` entries should focus on background, design decisions, and lessons learned. Use `lpUrl` for feature-focused landing pages and `repoUrl` as the primary implementation reference.

## Image Handling

Uses `astro:assets` Image component for optimization:
```astro
<Image src={heroImage} width={1020} height={510} alt="..." />
```

Provide `width` and `height` props for static analysis. Hero images on blog cards use CSS `aspect-ratio: 16/9` for consistency.

## Styling Approach

- **Design tokens:** Defined in `src/styles/tokens.css` under the `--kw-*` namespace (e.g. `--kw-accent`, `--kw-bg`, `--kw-fg`); base element styles live in `global.css`. Full spec in `docs/design-system.md`.
- **Typography:** BIZ UDPGothic for body text, Shippori Mincho for headings/signatures, JetBrains Mono for labels/code
- **Component Scoping:** Most styles are component-scoped in `.astro` files
- **Responsive:** Grid-based layouts with auto-fit columns, breakpoints at 900px, 720px, 640px
- **Cards:** Paper-like cards and motif panels using `--kw-*` tokens; hover motion is subtle and must respect reduced-motion

No CSS-in-JS framework; pure CSS only.

## Layout Components

**SiteLayout.astro:**
- Accepts: `title`, `description`, `image`, `mainClass`, `lang` (default: 'ja'), `locale`
- Wraps Header, main slot, Footer
- Auto-maps lang to locale format (ja → ja_JP, en → en_US)
- View Transitions enabled for smooth page navigation

**BlogPost.astro:**
- Expects `CollectionEntry<'blog'>` in data prop
- Renders hero image, post metadata (dates), and markdown content
- Responsive typography with scoped CSS

## Testing & Type Safety

- **Type checking:** Run `pnpm run build` to surface type errors and Astro validation issues
- **Unit tests:** `pnpm run test:unit` (vitest)。対象は `src/lib/**/*.test.ts` (content-schema / content / slug) と `tests/**/*.test.ts` (admin-preview-style / admin-theme / robots-txt)。`astro:content` は `src/lib/__mocks__/astro-content.ts` でスタブ (`vitest.config.ts`)
- **E2E tests:** Playwright tests in `tests/playwright/` (basic, a11y, url-check, blog-search, pagefind-index, mobile-header, no-horizontal-overflow, theme-after-swap, csp-config, hero-title-responsive, admin-smoke, admin-a11y の 12 spec)
  - Run with: `ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e` (CI と同じ `CRON_SECRET=ci-test-secret` をセットする正規経路。素の `pnpm exec playwright test` だと url-check の 401 テスト 3 件が落ちる)
  - Projects: chromium / firefox / mobile-chromium (Pixel 5)
  - Default port is `4335` (`PLAYWRIGHT_PORT` → `PORT` → 4335 の順で解決、`PLAYWRIGHT_HOST` / `HOST` も同様)。`reuseExistingServer: !CI` のため、別の dev サーバーが同ポートにいると誤応答で全滅する — その場合はポートを明示して回避する。
- **alt テキスト lint:** `pnpm run lint:alt` で `src/content/{blog,works}/**/*.{md,mdoc}` 内の markdown 画像を走査し、alt が空または 4 文字未満の箇所を検出する (`scripts/lint-alt.ts`)。CI の `lint` ジョブで Biome lint と並んで自動実行され、退行を検知する。
- **CI:** `.github/workflows/ci.yml` は 7 ジョブ並列 — Lint (biome ci + lint:alt) / Unit tests (vitest) / Typecheck (astro check) / Build (astro build) / E2E (Playwright, build の dist を利用) / Lighthouse CI / Link check (lychee)。ローカル再現できるのは前 5 つで、`/ship-check` が順に走らせる

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

**Adding a new blog post:**
1. Run `pnpm run new-post "タイトル"` (ASCII タイトルは自動 slug 生成、日本語は `--slug` で指定)
   - `pnpm run new-post "My Article"` → `src/content/blog/my-article.mdoc` (draft: true)
   - `pnpm run new-post "日本語の記事" --slug my-article` → slug を手動指定
   - `--suggest` フラグで作成後に `suggest-frontmatter` を実行し description/tags/category 候補を表示
2. `description`・`category`・`tags` を frontmatter に追記する
3. Run `pnpm run dev` to verify rendering
4. Build with `pnpm run build` to catch schema errors

**Modifying the Content Collections schema:**
1. Update `src/content.config.ts`
2. Ensure existing posts comply with new schema
3. Run `pnpm run build` to validate

**Adding a new page:**
1. Create `.astro` file in `src/pages/`
2. Use `SiteLayout` for consistent header/footer
3. Follow kebab-case naming for URL consistency

**Updating global styles:**
- Edit `src/styles/tokens.css` for design tokens and `src/styles/global.css` for base styles
- Component-specific styles go in `.astro` component files

**Suggesting frontmatter for a blog post (Claude Code login required):**
```bash
pnpm run suggest-frontmatter src/content/blog/<filename>.mdoc
```
`description` / `tags` / `category` の候補を表示するだけで、ファイルは書き換えない。

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
