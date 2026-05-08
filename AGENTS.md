# Repository Guidelines

## Project Structure & Module Organization
`src/pages` holds route-level `.astro` files; keep top-level routing logic here and delegate view logic to `src/components`. Shared UI such as `Header.astro` and utilities like `FormattedDate.astro` live under `src/components`. Layout wrappers belong in `src/layouts`. Long-lived constants sit in `src/consts.ts`. Markdown and MDX posts are managed by Astro Content Collections in `src/content/blog`; update `src/content.config.ts` when adding new collections. Global CSS resides in `src/styles`, and static assets go in `public`.

## Build, Test, and Development Commands
Run `npm install` before your first change. Use `npm run dev` (alias `npm start`) for the local dev server with hot reload. Ship code with `npm run build`, which runs `astro check` for type safety before producing the production build in `dist/`. Verify output locally with `npm run preview`.

## Coding Style & Naming Conventions
Follow the default Astro + TypeScript style: two-space indentation, trailing commas where valid, and PascalCase for components (`HeaderLink.astro`) while keeping utilities and constants in camelCase or UPPER_CASE as appropriate. Prefer named exports, and keep file names kebab-case under `src/pages` (e.g., `blog/index.astro`) to match route paths. Use markdown frontmatter fields `title`, `pubDate`, and `description` consistently in blog entries.

## Testing Guidelines
There is no dedicated unit-test harness yet; rely on `npm run build` to surface type and Astro errors. Before opening a PR, manually click through generated pages and check console warnings. When adding new content collections, create a draft entry and ensure the dev server renders it without schema warnings.

## Commit & Pull Request Guidelines
Recent commits show short, imperative subjects (often in Japanese) such as `記事を追加`; follow that style and keep subjects under 50 characters. Group related changes per commit. For PRs, include: a concise summary, screenshots for visual updates, reproduction steps for bug fixes, and links to tracked issues. Confirm `npm run build` succeeds before requesting review.
