# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This project uses **pnpm** (version 10.24.0) as the package manager:

```bash
# Install dependencies
pnpm install

# Development server (http://localhost:4321)
pnpm run dev       # or: pnpm start

# Production build (includes type checking)
pnpm run build     # Runs: astro check && astro build

# Preview production build locally
pnpm run preview

# Run Playwright E2E tests
pnpm exec playwright test

# Type check only
pnpm exec astro check
```

**Important:** This project uses `pnpm-workspace.yaml` which ignores `esbuild` and `sharp` in dependencies. The `.npmrc` file configures registry access; in restricted environments, set `COREPACK_NPM_REGISTRY` appropriately.

## Architecture Overview

This is a personal technical blog built with **Astro 5** + TypeScript, featuring:
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
│   └── config.ts    # Content Collections schema (title, pubDate, description, category, heroImage)
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

Japanese characters (and other non-ASCII) in blog post filenames are encoded in URLs for web server compatibility. This encoding **must be applied consistently** in three locations:

1. **Blog post routes** (`src/pages/blog/[...slug].astro`):
   ```typescript
   export async function getStaticPaths() {
     const posts = await getCollection('blog');
     return posts.map((post) => ({
       params: {
         slug: post.slug.split('/').map((segment) => encodeURIComponent(segment)).join('/'),
       },
       props: post,
     }));
   }
   ```

2. **Blog listing** (`src/pages/blog/index.astro`):
   ```typescript
   const encodedSlug = post.slug.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   // Used in: <a href={`/blog/${encodedSlug}/`}>
   ```

3. **Homepage and RSS feed** (`src/pages/index.astro`, `src/pages/rss.xml.js`):
   ```typescript
   const encodedSlug = post.slug.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   ```

**Why:** Raw filenames like `電子書籍.md` become `/blog/%E7%94%B5%E5%AD%90%E6%9B%B8%E7%B1%8D/` in URLs. Skipping this encoding will cause 404 errors.

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

Schema is defined in `src/content/config.ts` using Zod. New fields require schema updates.

## Image Handling

Uses `astro:assets` Image component for optimization:
```astro
<Image src={heroImage} width={1020} height={510} alt="..." />
```

Provide `width` and `height` props for static analysis. Hero images on blog cards use CSS `aspect-ratio: 16/9` for consistency.

## Styling Approach

- **CSS Variables:** Defined in `global.css` (--accent, --black, --gray, --surface, etc.)
- **Typography:** Zen Maru Gothic font (Japanese-optimized), fluid sizing with `clamp()`
- **Component Scoping:** Most styles are component-scoped in `.astro` files
- **Responsive:** Grid-based layouts with auto-fit columns, breakpoints at 900px, 720px, 640px
- **Cards:** Hover effects with `translateY(-4px)` and shadow elevation

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

## Common Development Tasks

**Adding a new blog post:**
1. Create `.md` or `.mdx` file in `src/content/blog/`
2. Include required frontmatter: `title`, `description`, `pubDate`
3. Run `pnpm run dev` to verify rendering
4. Build with `pnpm run build` to catch schema errors

**Modifying the Content Collections schema:**
1. Update `src/content/config.ts`
2. Ensure existing posts comply with new schema
3. Run `pnpm run build` to validate

**Adding a new page:**
1. Create `.astro` file in `src/pages/`
2. Use `SiteLayout` for consistent header/footer
3. Follow kebab-case naming for URL consistency

**Updating global styles:**
- Edit `src/styles/global.css` for CSS variables and base styles
- Component-specific styles go in `.astro` component files

## Key Integrations

- **@astrojs/mdx:** MDX support for interactive content
- **@astrojs/rss:** RSS feed generation at `/rss.xml`
- **@astrojs/sitemap:** Auto-generated XML sitemap
- **Playwright:** E2E testing framework

## Locale & Accessibility

- **Default language:** Japanese (`ja`)
- **OGP locale:** Auto-set to `ja_JP` in BaseHead.astro
- **Accessibility:** ARIA labels on navigation, `rel` attributes on external links, `prefers-reduced-motion` support
- **Font preloading:** Zen Maru Gothic for Japanese text optimization
