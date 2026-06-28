<!-- markdownlint-disable MD013 MD060 -->

# Plan 001: Bundle the CMS admin runtime into audited project assets

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b6f26a6..HEAD -- src/pages/admin.astro public/admin/config.yml package.json pnpm-lock.yaml pnpm-workspace.yaml vercel.json tests/playwright`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security / dependencies
- **Planned at**: commit `b6f26a6`, 2026-06-28

## Why this matters

The CMS admin page currently imports its application code and YAML parser directly from public CDNs at browser runtime. Those versions are not represented in `pnpm-lock.yaml`, are not reviewed by Dependabot, and are not covered by `pnpm audit`. Bundling the admin runtime through the repo makes the exact code path reproducible, lets CI/audit tooling see the dependencies, and prepares the site for an enforcing CSP in Plan 002.

This must preserve the ADR 0016 decision: Sveltia CMS should remain a static SPA under `/admin` and must not reintroduce Keystatic, React, or an Astro version lock.

## Current state

Relevant files:

- `src/pages/admin.astro` — serves the Sveltia CMS static admin page and registers the custom `mdoc` format.
- `public/admin/config.yml` — Decap/Sveltia-compatible collection config; keep this file as the CMS source of truth.
- `package.json` / `pnpm-lock.yaml` — audited dependency manifest and lockfile.
- `pnpm-workspace.yaml` — supply-chain policy and security overrides.
- `vercel.json` — CSP currently allows the remote admin scripts; Plan 002 tightens it after this plan.

Current remote imports in `src/pages/admin.astro:15-17`:

```astro
<script type="module">
  import CMS from "https://unpkg.com/@sveltia/cms/dist/sveltia-cms.mjs";
  import YAML from "https://esm.sh/js-yaml@4.1.0";
```

Current config loading in `src/pages/admin.astro:80-90`:

```js
const response = await fetch("/admin/config.yml");
const config = YAML.load(await response.text());

config.load_config_file = false;
config.collections = config.collections.map((collection) =>
  ["blog", "works"].includes(collection.name)
    ? { ...collection, format: "mdoc" }
    : collection,
);

CMS.init({ config });
```

Relevant ADR 0016 constraint, `docs/adr/0016-cms-keystatic-to-sveltia.md`:

> Sveltia は CDN 配信の静的 SPA で Astro に一切依存しないため、`/admin` ルート（`src/pages/admin.astro`）と `public/admin/config.yml` を置く構成とする。

For this plan, reinterpret "CDN 配信" as the original migration shape, not a hard requirement to keep unpinned runtime CDN imports. Keep the important decision: static SPA, no Keystatic, no React, no server runtime.

Repo conventions to match:

- TypeScript/Astro style uses 2-space indentation in scripts and double quotes in TS/JS, enforced by Biome.
- Do not use CSS-in-JS or React; the admin page can remain a plain Astro page with a client-side module script.
- Package manager is pnpm 11.1.3 (`package.json: packageManager`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install/update lockfile | `pnpm add -D @sveltia/cms yaml` | exit 0; `package.json` and `pnpm-lock.yaml` updated |
| Typecheck | `pnpm exec astro check` | exit 0; 0 errors |
| Lint | `pnpm run lint` | exit 0 |
| Unit tests | `pnpm run test:unit` | all tests pass |
| Dependency audit | `pnpm audit --registry=https://registry.npmjs.org/ --audit-level=high` | no HIGH/CRITICAL vulnerabilities |
| Build | `pnpm exec astro build` | exit 0; `dist/client/admin/index.html` exists |
| CDN-regression check | `rg -n "unpkg.com|esm.sh|js-yaml@4\.1\.0" src/pages/admin.astro vercel.json package.json pnpm-workspace.yaml` | no matches in `src/pages/admin.astro`; remaining `vercel.json` matches are addressed by Plan 002 |

## Scope

**In scope** (the only files you should modify):

- `src/pages/admin.astro`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml` only if a direct `yaml` dependency makes an existing override comment stale
- `tests/playwright/*` only if you add a narrow `/admin` smoke test

**Out of scope** (do NOT touch):

- `public/admin/config.yml` collection semantics — do not alter CMS fields or media folders in this plan.
- `vercel.json` CSP enforcement — Plan 002 handles it after this bundle change lands.
- Any Keystatic, React, or `@astrojs/react` dependency — reintroducing them violates ADR 0016.
- OAuth proxy implementation or credentials.

## Git workflow

- Branch: `advisor/001-bundle-cms-admin-assets`
- Commit message style: short imperative Japanese, e.g. `CMS 管理画面の依存をバンドル化`
- Do not push or open a PR unless instructed by the operator.

## Steps

### Step 1: Add audited direct dependencies

Run:

```bash
pnpm add -D @sveltia/cms yaml
```

Use the versions selected by pnpm under the repo's supply-chain policy. Do not add `js-yaml` unless you have confirmed there is a non-vulnerable maintained version and a reviewer asked for it. Prefer the `yaml` package because this repo already tracks `yaml` security through `pnpm-workspace.yaml` overrides.

**Verify**: `rg -n '"@sveltia/cms"|"yaml"' package.json` → both dependencies appear under `devDependencies`.

### Step 2: Convert the admin script to bundled imports

Update `src/pages/admin.astro` so the browser module script is processed/bundled by Astro instead of importing from remote URLs.

Target shape:

```astro
<script>
  import CMS from "@sveltia/cms";
  import { parse, stringify } from "yaml";
```

Then replace YAML API usage:

- `YAML.load(frontmatterText)` → `parse(frontmatterText)`
- `YAML.dump(frontmatter, { lineWidth: 100, noRefs: true, sortKeys: false })` → `stringify(frontmatter, { lineWidth: 100, sortMapEntries: false }).trim()`
- `YAML.load(await response.text())` → `parse(await response.text())`

Keep `normalizeDates`, `splitFrontmatter`, `CMS.registerCustomFormat("mdoc", "mdoc", ...)`, the `/admin/config.yml` fetch, and `CMS.init({ config })` behavior intact.

If TypeScript complains about the shape of `config`, add the smallest local type annotation needed inside the script; do not convert this file to a React app or separate build pipeline.

**Verify**: `pnpm exec astro check` → exit 0, 0 errors. The previous Astro hint about `<script type="module">` should disappear because the script should no longer have a `type` attribute.

### Step 3: Build and confirm the admin page no longer references runtime CDNs

Run:

```bash
pnpm exec astro build
```

Then inspect the built admin HTML:

```bash
rg -n "unpkg.com|esm.sh|js-yaml@4\.1\.0|@sveltia/cms/dist/sveltia-cms" dist/client/admin dist/client/_astro
```

Expected: no matches. It is acceptable for bundled chunk filenames under `dist/client/_astro/` to be generated and hashed.

**Verify**: `test -f dist/client/admin/index.html && echo ok` → prints `ok`.

### Step 4: Keep supply-chain comments accurate

If `pnpm-workspace.yaml` still has an override/comment that implies only transitive `yaml` usage, adjust the comment to say `yaml` is now a direct admin parser dependency too. Do not remove security overrides unless `pnpm why <package>` proves the package is absent from the dependency tree.

**Verify**: `pnpm audit --registry=https://registry.npmjs.org/ --audit-level=high` → no HIGH/CRITICAL vulnerabilities.

### Step 5: Run the local quality gates

Run:

```bash
pnpm run lint
pnpm run test:unit
pnpm exec astro check
```

**Verify**: all three commands exit 0.

## Test plan

- No new test is strictly required if `astro build` proves `/admin` bundles successfully and the CDN grep passes.
- Optional: add a narrow Playwright smoke test in `tests/playwright/url-check.spec.ts` that `GET /admin` returns 200 and contains the title `keroway CMS`. Do not automate GitHub OAuth login.
- Existing patterns: use `tests/playwright/url-check.spec.ts` for route smoke checks.

## Done criteria

All must hold:

- [ ] `src/pages/admin.astro` has no `https://unpkg.com` or `https://esm.sh` imports.
- [ ] `package.json` and `pnpm-lock.yaml` include direct audited dependencies needed by the admin bundle.
- [ ] `pnpm audit --registry=https://registry.npmjs.org/ --audit-level=high` exits 0.
- [ ] `pnpm exec astro build` exits 0 and built admin output contains no `unpkg.com`, `esm.sh`, or `js-yaml@4.1.0` references.
- [ ] `pnpm run lint`, `pnpm run test:unit`, and `pnpm exec astro check` exit 0.
- [ ] No out-of-scope files are modified (`git status --short`).
- [ ] `plans/README.md` row for Plan 001 is updated.

## STOP conditions

Stop and report back if:

- `@sveltia/cms` is not importable from npm or Astro cannot bundle it without introducing React/Keystatic.
- The `yaml` package cannot parse the existing `public/admin/config.yml` without changing collection semantics.
- `pnpm audit --audit-level=high` reports a HIGH/CRITICAL advisory reachable through the newly added direct dependencies.
- Making the admin page work appears to require modifying OAuth credentials, Cloudflare Worker code, or GitHub App settings.
- The live code at `src/pages/admin.astro:15-17` no longer matches the current-state excerpt.

## Maintenance notes

Plan 002 depends on this plan: CSP enforcement should not proceed until `/admin` no longer needs `script-src https://unpkg.com https://esm.sh`. Reviewers should scrutinize the generated lockfile and confirm no Keystatic/React dependencies were reintroduced. If Sveltia later publishes a breaking change, Dependabot/audit should now surface that through normal dependency review instead of silent CDN drift.
