# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Claude Code セットアップ

このリポジトリは Claude Code 用に次の構成を持つ。**実装に着手する前に必ず参照する。**

- **詳細な実装方針:** @.claude/rules/implementation.md (スコープ管理、Astro 6 固有の罠、検証順序などのルール)
- **サブエージェント:**
  - `web-designer` — UI/UX 改善・新規ページ設計 (`docs/design-system.md` 準拠、Playwright MCP でスクリーンショット比較可)
  - `web-director` — 要件/アーキテクチャ判断、PR スコープ管理、ADR 起票判断
- **スラッシュコマンド:**
  - `/ship-check [pw filter]` — CI 4 ジョブ (lint / typecheck / build / playwright) と同じコマンドを順に走らせる PR 直前ゲート。build は `astro check` 込みの `pnpm run build` ではなく `astro build` 直叩きで、CI と同じ並列構成を再現する。
  - `/fix-ci <PR番号>` — 指定 PR の落ちた CI ログを `gh` で取得して修正に当たる (PR 番号は必ず明示)
- **自動 hook:**
  - `PostToolUse` (`Edit | Write | MultiEdit`) 直後に `.claude/hooks/format-on-write.sh` が走り、対象拡張子 (`.ts/.tsx/.js/.jsx/.mjs/.cjs/.json`) は Biome で format される。`.astro` / `.md` / `.css` は対象外。
  - `SessionEnd` hook 用に `.claude/hooks/stop-dev-server.sh` を用意 (セッション中に立ち上げた `astro dev` を cwd スコープで停止＝立ちっぱなし防止、共有 portless proxy デーモンは残す)。**有効化には `.claude/settings.json` の `hooks` に `SessionEnd` エントリの登録が必要** (エージェント設定ファイルの自己改変ガードにより登録は手動で行う)。

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

# Run Playwright E2E tests
pnpm exec playwright test

# Type check only
pnpm exec astro check
```

**Dev サーバー (portless):** `pnpm dev` / `pnpm start` は [portless](https://github.com/vercel-labs/portless) 経由で `astro dev` を起動し、固定ポート 4321 ではなく `https://keroway.localhost` で配信する (内部はランダムポート割当でポート競合が消える)。HTTPS 構成のため**初回のみ** CA 信頼登録と 443 バインドで sudo 昇格が走る (`portless trust` / proxy 起動)。proxy は port 443 の常駐デーモンで、プロジェクト横断の共有ルーター。セッション終了時の停止は SessionEnd hook (下記、要登録) が担い、`astro dev` 本体だけを止めて proxy は残す。portless を使わず素の `astro dev` を 4321 で動かしたいときは `pnpm dev:astro`。

**Important:** `pnpm-workspace.yaml` で `esbuild` / `sharp` の build スクリプトは `allowBuilds: false` (v10 までの `ignoredBuiltDependencies` 相当) で無効化。`overrides` / `peerDependencyRules` も pnpm 11 の正規場所として `pnpm-workspace.yaml` に集約 (v10 までは `package.json#pnpm` 配下)。pnpm 11 のサプライチェーン保護 (`minimumReleaseAge=1440`, `strictDepBuilds=true`, `blockExoticSubdeps=true`) はデフォルト有効、追加で `minimumReleaseAgeStrict: true` を設定済み。`.npmrc` は registry のみで、制約のある環境では `COREPACK_NPM_REGISTRY` を併設する。

## Architecture Overview

This is a personal portfolio and technical blog (keroway.com) built with **Astro 6** + TypeScript, featuring:
- Japanese language support with URL-encoded slugs
- Content management via Astro Content Collections (Markdown/MDX)
- Responsive card-based blog listing with 16:9 aspect ratio images
- RSS feed and sitemap auto-generation
- Deployment on Vercel

### Directory Structure

```
src/
├── components/       # Reusable UI: BaseHead, Header, Footer, FormattedDate, HeaderLink
├── content/
│   ├── blog/        # Markdown/MDX blog posts
│   └── works/       # Markdown/MDX entries for portfolio/projects
├── content.config.ts    # Content Collections schema for blog / works
├── layouts/
│   ├── SiteLayout.astro    # Main page wrapper with Header/Footer
│   └── BlogPost.astro      # Blog post layout with image optimization
├── pages/
│   ├── index.astro         # Homepage (hero, recent posts, focus areas)
│   ├── about.astro         # About page
│   ├── blog/
│   │   ├── index.astro     # Blog listing (card grid, sorted by date)
│   │   └── [...slug].astro # Dynamic blog post routes
│   └── rss.xml.js          # RSS feed generation
├── styles/
│   └── global.css          # Root CSS variables, typography, base styles
└── consts.ts               # SITE_TITLE, SITE_DESCRIPTION
```

**Routing Logic:** Keep top-level routing in `src/pages/`, delegate view logic to `src/components/`. Layout wrappers belong in `src/layouts/`.

## Critical: Japanese Slug Encoding Pattern

Astro 6 の Content Layer API では `post.id` がスラグ（ファイル名から拡張子を除いたもの）になります。`post.id` には日本語文字が含まれるため、HTML の `href` 属性では `encodeURIComponent` が必要ですが、`getStaticPaths()` のパラメータでは**エンコード不要**です（Astro が内部処理）。

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

2. **Blog listing** (`src/pages/blog/index.astro`):
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
category: "Cloud & DevOps"         # Optional
heroImage: "https://..."           # Optional (for card thumbnails)
updatedDate: 2024-01-20            # Optional
---
```

Schema is defined in `src/content.config.ts` using Zod (imported from `astro/zod`). New fields require schema updates.

Works entries in `src/content/works/` use a separate collection with:

```yaml
---
title: "Project Name"                   # Required
description: "Short summary"            # Required
status: "active"                        # Required: active | archived | wip
repoUrl: "https://github.com/..."       # Required
lpUrl: "https://..."                    # Required: landing page / external intro
demoUrl: "https://..."                  # Optional
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
- **E2E tests:** Playwright tests in `tests/playwright/basic.spec.ts`
  - Tests homepage, blog listing navigation, and about page
  - Run with: `pnpm exec playwright test`
  - Default port is `4321`. If another process (e.g. a different `astro dev`) is already on 4321, override with `PLAYWRIGHT_PORT=4322 pnpm exec playwright test` (also accepts `PLAYWRIGHT_HOST` / falls back to `PORT` / `HOST`). Without the override, `reuseExistingServer: true` would let the wrong dev server answer the requests and cause every test to fail.
- **alt テキスト lint:** `pnpm run lint:alt` で `src/content/{blog,works}/**/*.{md,mdx}` 内の markdown 画像を走査し、alt が空または 4 文字未満の箇所を検出する (`scripts/lint-alt.ts`)。CI の `lint` ジョブで Biome lint と並んで自動実行され、退行を検知する。
- **No unit tests:** Rely on TypeScript strict mode and Content Collections schema validation

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
1. Create `.md` or `.mdx` file in `src/content/blog/`
2. Include required frontmatter: `title`, `description`, `pubDate`
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
pnpm run suggest-frontmatter src/content/blog/<filename>.md
```
`description` / `tags` / `category` の候補を表示するだけで、ファイルは書き換えない。

## Key Integrations

- **@astrojs/mdx:** MDX support for interactive content
- **@astrojs/rss:** RSS feed generation at `/rss.xml`
- **@astrojs/sitemap:** Auto-generated XML sitemap
- **Playwright:** E2E testing framework

## Locale & Accessibility

- **Default language:** Japanese (`ja`)
- **OGP locale:** Auto-set to `ja_JP` in BaseHead.astro
- **Accessibility:** ARIA labels on navigation, `rel` attributes on external links, `prefers-reduced-motion` support
- **Web fonts:** Shippori Mincho + BIZ UDPGothic + JetBrains Mono via Google Fonts (`display=swap` + `preconnect` in `BaseHead.astro`). Zen Maru Gothic is used only for OG image generation (satori), not for page text.
