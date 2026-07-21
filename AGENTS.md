# Repository Guidelines

## Project Overview
keroway.com — エンジニア keroway のポートフォリオ・技術ブログ。Works（制作物紹介）と Blog（技術記事）を統合した Astro 7 製の静的サイト。Vercel にデプロイ。

## Project Structure & Module Organization
`src/pages` holds route-level `.astro` files; keep top-level routing logic here and delegate view logic to `src/components`. Shared UI such as `Header.astro` and utilities like `FormattedDate.astro` live under `src/components`. Layout wrappers belong in `src/layouts`. Long-lived constants sit in `src/consts.ts`. Markdown and Markdoc posts are managed by Astro Content Collections in `src/content/blog` and `src/content/works`; update `src/content.config.ts` when adding new collections. Global CSS resides in `src/styles`, and static assets go in `public`.

## Build, Test, and Development Commands
Run `pnpm install` before your first change. Use `pnpm run dev` (alias `pnpm start`) for the local dev server with hot reload; it runs through portless at https://keroway.localhost (first run elevates with sudo for the HTTPS proxy). Use `pnpm run dev:astro` for plain `astro dev` on http://localhost:4321. Ship code with `pnpm run build`, which runs `astro check` for type safety before producing the production build in `dist/`. Verify output locally with `pnpm run preview`. Run unit tests with `pnpm run test:unit` (vitest) and E2E tests with `ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e` (Playwright; sets `CRON_SECRET` to match CI, and opts out of Astro 7's automatic background dev server for agent sessions).

## Coding Style & Naming Conventions
Follow the default Astro + TypeScript style: two-space indentation, trailing commas where valid, and PascalCase for components (`HeaderLink.astro`) while keeping utilities and constants in camelCase or UPPER_CASE as appropriate. Prefer named exports, and keep file names kebab-case under `src/pages` (e.g., `blog/index.astro`) to match route paths. Use markdown frontmatter fields `title`, `pubDate`, and `description` consistently in blog entries.

## Testing Guidelines
Rely on `pnpm run build` to surface type and Astro errors, `pnpm run test:unit` for library logic under `src/lib`, and `pnpm run test:e2e` for page-level regressions. Before opening a PR, manually click through generated pages and check console warnings. When adding new content collections, create a draft entry and ensure the dev server renders it without schema warnings.

## Commit & Pull Request Guidelines
Recent commits show short, imperative subjects (often in Japanese) such as `記事を追加`; follow that style and keep subjects under 50 characters. Group related changes per commit. For PRs, include: a concise summary, screenshots for visual updates, reproduction steps for bug fixes, and links to tracked issues. Confirm `pnpm run build` succeeds before requesting review.
