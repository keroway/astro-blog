<!-- markdownlint-disable MD013 MD060 -->

# Plan 005: Keep CMS field options and authoring helpers in sync with the Astro content schema

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4b5cba0..HEAD -- src/content.config.ts public/admin/config.yml scripts/suggest-frontmatter.ts src/lib/content.test.ts package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests / dx / correctness
- **Planned at**: commit `4b5cba0`, 2026-06-30

## Why this matters

The blog category source of truth is `src/content.config.ts`, but the authoring helper `scripts/suggest-frontmatter.ts` currently has its own legacy category list. That helper can suggest values such as `Arduino`, `Python`, or `読書`, while the Astro collection schema only accepts `dev`, `hardware`, `tools`, `reading`, or `event`; adopting a bad suggestion would make `astro check` fail. The CMS config also duplicates field options and requiredness. Add a small shared metadata module plus regression tests so future content-schema changes fail fast before editors or agents generate invalid frontmatter.

## Current state

Relevant files:

- `src/content.config.ts` — Astro Content Collections schema; validates blog and works frontmatter during `astro check` / build.
- `public/admin/config.yml` — Sveltia CMS field definitions shown to editors.
- `scripts/suggest-frontmatter.ts` — Claude-assisted frontmatter suggestion CLI.
- `src/lib/content.test.ts` — existing Vitest file for content helper behavior; use its style as the nearest test convention.

Current excerpts:

```ts
// src/content.config.ts:14-16
category: z
  .enum(["dev", "hardware", "tools", "reading", "event"])
  .optional(),
```

```ts
// scripts/suggest-frontmatter.ts:13-45
// audit-blog.ts の正規カテゴリ集合 + 実際に使用されているカテゴリを統合
const CANONICAL_CATEGORIES = [
  "Arduino",
  "BeautifulSoup",
  "Clojure",
  "Cloud",
  // ... many legacy topic labels ...
  "読書",
  "電子書籍",
] as const;
```

```yaml
# public/admin/config.yml:91-102
- label: カテゴリ
  name: category
  widget: select
  required: false
  options:
    - { label: "開発・プログラミング", value: dev }
    - { label: "ハードウェア・電子工作", value: hardware }
    - { label: "ツール・インフラ", value: tools }
    - { label: "読書", value: reading }
    - { label: "イベント・参加記", value: event }
```

```ts
// src/content.config.ts:31-39
status: z.enum(["active", "archived", "wip"]),
heroImage: image().optional(),
repoUrl: z.url().optional(),
lpUrl: z.url(),
demoUrl: z.url().optional(),
tags: z.array(z.string()),
createdAt: z.coerce.date(),
updatedAt: z.coerce.date().optional(),
featured: z.boolean().default(false),
```

Repo conventions:

- TypeScript uses two-space indentation and named exports where practical.
- Unit tests use Vitest and currently live under `src/lib/*.test.ts`.
- Verification baseline observed during planning: `pnpm exec astro check` exits 0, `pnpm run test:unit` reports 23 passing tests, and `pnpm run lint:alt` passes.

Design constraints:

- README says `package.json` is the version/source-of-truth for tool versions; keep commands aligned with existing scripts.
- ADR 0016 keeps Sveltia CMS as a static Git-based editor while Astro Content Collections remain the independent type-safety boundary. Do not make runtime CMS code import Astro-only modules.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Install | `pnpm install` | exit 0 |
| Unit tests | `pnpm run test:unit` | all Vitest tests pass |
| Typecheck | `pnpm exec astro check` | 0 errors |
| Lint | `pnpm run lint` | exit 0 |
| Alt lint sanity | `pnpm run lint:alt` | `✓ alt テキストの問題なし ...` |

## Scope

**In scope** (the only source files you should modify):

- `src/content.config.ts`
- `public/admin/config.yml`
- `scripts/suggest-frontmatter.ts`
- `src/lib/content.test.ts` or a new `src/lib/content-schema.test.ts`
- optionally a new shared module under `src/lib/`, e.g. `src/lib/content-schema.ts`

**Out of scope** (do NOT touch):

- Existing content files under `src/content/`.
- CMS runtime behavior in `src/pages/admin.astro`.
- Any dependency upgrade or package-manager change.
- Any automatic rewrite of frontmatter values.

## Git workflow

- Branch: `advisor/005-sync-cms-schema-tests`
- Commit message style: short Japanese imperative, matching recent history, e.g. `CMS スキーマ同期テストを追加`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Extract shared content metadata without depending on Astro-only APIs

Create a small shared module, recommended path `src/lib/content-schema.ts`, exporting constants for duplicated enumerations and labels:

- `BLOG_CATEGORIES` as `['dev', 'hardware', 'tools', 'reading', 'event'] as const`
- `BLOG_CATEGORY_LABELS` mapping each category to the Japanese label already present in `public/admin/config.yml`
- `WORKS_STATUSES` as `['active', 'archived', 'wip'] as const`

Then update `src/content.config.ts` to use these constants in `z.enum(...)`. If TypeScript complains about tuple inference for `z.enum`, preserve the literal tuple type rather than casting to `string[]`.

**Verify**: `pnpm exec astro check` → exits 0 with 0 errors.

### Step 2: Make `suggest-frontmatter` suggest only build-valid categories

Replace the legacy `CANONICAL_CATEGORIES` list in `scripts/suggest-frontmatter.ts` with the shared `BLOG_CATEGORIES` values. Keep the prompt wording, but make it clear these are broad site categories, not historical topic tags. The resulting JSON schema enum must contain exactly `dev`, `hardware`, `tools`, `reading`, and `event`.

Do not change the script from read-only suggestion mode; it must continue to print suggestions and avoid writing files.

**Verify**: `pnpm run test:unit` → all existing tests still pass.

### Step 3: Add a regression test for duplicated CMS/schema options

Add Vitest coverage in a new `src/lib/content-schema.test.ts` or inside `src/lib/content.test.ts`.

Test requirements:

1. Parse `public/admin/config.yml` using the existing `yaml` dependency.
2. Find the `blog` collection's `category` field and assert its option values exactly equal `BLOG_CATEGORIES`.
3. Find the `works` collection's `status` field and assert its option values exactly equal `WORKS_STATUSES`.
4. Assert the blog `category` field is `required: false`, matching `optional()` in the Astro schema.
5. Assert the works `lpUrl` field is not `required: false`, matching required `lpUrl: z.url()` in the Astro schema.

Keep the parser/test narrowly targeted; do not attempt to fully validate the Decap/Sveltia config schema.

**Verify**: `pnpm run test:unit` → all tests pass, including the new sync tests.

### Step 4: Run the full local verification gate

Run these commands in order:

1. `pnpm run test:unit`
2. `pnpm exec astro check`
3. `pnpm run lint`
4. `pnpm run lint:alt`

**Verify**: all commands exit 0. `astro check` should report 0 errors. `lint:alt` should report no alt-text problems.

## Test plan

- Add unit tests for CMS option synchronization as described in Step 3.
- Use the existing Vitest style in `src/lib/content.test.ts` as a pattern: small `describe` blocks, direct `expect(...)` assertions, no snapshots.
- Verification: `pnpm run test:unit` passes and the new tests fail if `public/admin/config.yml` drifts from the shared category/status constants.

## Done criteria

- [ ] `scripts/suggest-frontmatter.ts` can no longer emit category values outside the Astro blog schema.
- [ ] `src/content.config.ts` uses shared category/status constants instead of duplicating literal arrays directly in the schema.
- [ ] A Vitest regression test checks blog category options and works status options in `public/admin/config.yml` against shared constants.
- [ ] `pnpm run test:unit` exits 0.
- [ ] `pnpm exec astro check` exits 0 with 0 errors.
- [ ] `pnpm run lint` exits 0.
- [ ] `pnpm run lint:alt` exits 0.
- [ ] No files outside the in-scope list are modified, except `plans/README.md` status if you were asked to update it.

## STOP conditions

Stop and report back if:

- `public/admin/config.yml` no longer has a `blog` collection with a `category` field or a `works` collection with a `status` field.
- Importing the shared module from `scripts/suggest-frontmatter.ts` causes runtime issues under `node --experimental-strip-types` that cannot be fixed without changing the script invocation model.
- Making `content.config.ts` import a shared module breaks Astro's content collection loading.
- The fix appears to require editing existing content files or changing CMS runtime behavior.

## Maintenance notes

When adding a new blog category or works status later, update the shared constants first and let the sync test point out every place that needs a matching UI label/config change. Reviewers should scrutinize that the shared module remains framework-neutral; it must not import from `astro:content`, `astro/zod`, or browser-only CMS code.
