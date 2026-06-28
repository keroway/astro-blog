<!-- markdownlint-disable MD013 MD060 -->

# Plan 002: Enforce the site Content Security Policy

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b6f26a6..HEAD -- vercel.json src/pages/admin.astro src/components/BaseHead.astro src/layouts/SiteLayout.astro tests/playwright package.json pnpm-lock.yaml`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `plans/001-bundle-cms-admin-assets.md`
- **Category**: security
- **Planned at**: commit `b6f26a6`, 2026-06-28

## Why this matters

The repository already defines a Content Security Policy, but it is shipped as `Content-Security-Policy-Report-Only`. Report-only policies are useful while measuring breakage, but they do not block script injection, framing, or unexpected network targets. Once Plan 001 removes the admin page's runtime CDN imports, the policy can be enforced with fewer external allowances.

This plan intentionally does not try to remove all inline script allowances. Astro and the site's FOUC-prevention script currently use inline code, so the safe first step is to enforce a policy that matches the existing runtime while removing obsolete CDN script origins.

## Current state

Relevant files:

- `vercel.json` — production headers for all routes.
- `src/components/BaseHead.astro` — contains the inline theme/reduced-motion setup and Vercel Analytics script.
- `src/layouts/SiteLayout.astro` — includes page transition and reveal scripts that may be bundled by Astro.
- `src/pages/admin.astro` — after Plan 001, should use bundled npm imports instead of remote CDN imports.
- `tests/playwright/*` — E2E smoke tests can catch gross CSP breakage.

Current CSP in `vercel.json:540-542`:

```json
{
  "key": "Content-Security-Policy-Report-Only",
  "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com https://esm.sh; style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com https://unpkg.com https://api.github.com https://github.com https://www.githubstatus.com https://sveltia-cms-auth.kurokawa-y.workers.dev; frame-ancestors 'none'"
}
```

Inline script that still requires `'unsafe-inline'`, `src/components/BaseHead.astro:35-68`:

```astro
<script is:inline>
  (function () {
    try {
      var s = localStorage.getItem('theme');
      ...
  })();
</script>
```

Vercel Analytics script in `src/components/BaseHead.astro:133-134`:

```astro
<script is:inline defer src="/_vercel/insights/script.js"></script>
```

Plan 001 should remove these remote imports from `src/pages/admin.astro:16-17` before this plan starts:

```js
import CMS from "https://unpkg.com/@sveltia/cms/dist/sveltia-cms.mjs";
import YAML from "https://esm.sh/js-yaml@4.1.0";
```

Repo conventions to match:

- `vercel.json` is hand-maintained JSON with two-space indentation.
- Security headers already live in the catch-all `source: "/(.*)"` block; keep related headers together.
- Do not weaken existing headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Dependency prerequisite check | `rg -n "unpkg.com|esm.sh" src/pages/admin.astro` | no matches |
| JSON syntax | `node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('ok')"` | prints `ok` |
| Build | `pnpm exec astro build` | exit 0 |
| E2E smoke | `pnpm exec playwright test tests/playwright/basic.spec.ts tests/playwright/blog-search.spec.ts` | all selected tests pass |
| Header grep | `rg -n "Content-Security-Policy-Report-Only|<https://unpkg.com>|<https://esm.sh>" vercel.json` | no matches after edit |
| Lint | `pnpm run lint` | exit 0 |

## Scope

**In scope** (the only files you should modify):

- `vercel.json`
- `tests/playwright/*` only if you add a CSP/header regression check

**Out of scope**:

- Bundling or dependency changes for `/admin` — Plan 001 owns that.
- Removing all inline scripts or introducing CSP nonces/hashes — useful later, but too large for this plan.
- OAuth proxy or GitHub backend settings.
- Route/content changes unrelated to CSP.

## Git workflow

- Branch: `advisor/002-enforce-csp`
- Commit message style: short imperative Japanese, e.g. `CSP を適用モードにする`
- Do not push or open a PR unless instructed by the operator.

## Steps

### Step 1: Confirm Plan 001 has landed

Run:

```bash
rg -n "unpkg.com|esm.sh" src/pages/admin.astro
```

Expected: no matches. If matches remain, stop and complete Plan 001 first.

**Verify**: the command exits 1 with no output (ripgrep's normal "no matches" exit), or prints no matches in your harness.

### Step 2: Switch the policy from report-only to enforcing

In `vercel.json`, change the header key:

```json
"key": "Content-Security-Policy"
```

Remove obsolete CDN allowances that Plan 001 made unnecessary:

- remove `https://unpkg.com` from `script-src`, `style-src`, and `connect-src`
- remove `https://esm.sh` from `script-src`

Keep these allowances unless a local test proves they are unused:

- `script-src 'self' 'unsafe-inline'` for Astro/site inline scripts
- `style-src 'self' 'unsafe-inline'` for inline/component styles
- `img-src 'self' data: https:` because content and OG images may include HTTPS assets
- `font-src 'self' data:` and any still-required Astro font locations
- `connect-src 'self' https://va.vercel-scripts.com https://api.github.com https://github.com https://www.githubstatus.com https://sveltia-cms-auth.kurokawa-y.workers.dev`
- `frame-ancestors 'none'`

Target value shape:

```json
"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://va.vercel-scripts.com https://api.github.com https://github.com https://www.githubstatus.com https://sveltia-cms-auth.kurokawa-y.workers.dev; frame-ancestors 'none'"
```

If the build or E2E shows Astro Fonts still needs an external font host at runtime, keep the narrow host and document why in a nearby comment. Do not add broad wildcards.

**Verify**:

```bash
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8')); console.log('ok')"
rg -n "Content-Security-Policy-Report-Only|https://unpkg.com|https://esm.sh" vercel.json
```

Expected: JSON parse prints `ok`; grep has no matches.

### Step 3: Add a narrow header regression test if practical

If the existing Playwright `request` fixture can observe `vercel.json` headers under the dev server, add a test. If it cannot (Astro dev usually does not apply Vercel headers), do not fake it.

Preferred low-flake alternative: add a small Node-based assertion to an existing test file or a new test under `tests/playwright/` that reads `vercel.json` and asserts:

- the catch-all headers contain `Content-Security-Policy`
- they do not contain `Content-Security-Policy-Report-Only`
- the CSP value does not include `unpkg.com` or `esm.sh`
- the CSP value includes `frame-ancestors 'none'`

Use `tests/playwright/pagefind-index.spec.ts` as the pattern for filesystem assertions inside Playwright.

**Verify**: `pnpm exec playwright test tests/playwright/<new-or-updated-file>.spec.ts` → the new assertion passes.

### Step 4: Build and smoke-test key client behavior

Run:

```bash
pnpm exec astro build
pnpm exec playwright test tests/playwright/basic.spec.ts tests/playwright/blog-search.spec.ts
```

Expected: build exits 0; selected Playwright tests pass. The selected tests cover navigation, JSON-LD/meta basics, works pages, and Pagefind search UI.

### Step 5: Run lint

Run:

```bash
pnpm run lint
```

Expected: exit 0.

## Test plan

- Add a CSP config regression test only if it can be deterministic without requiring Vercel production headers.
- Run `basic.spec.ts` and `blog-search.spec.ts` to catch client-side breakage caused by CSP changes.
- A full `pnpm exec playwright test` is desirable before PR, but the minimum gate for this plan is the selected smoke suite plus `astro build`.

## Done criteria

All must hold:

- [ ] Plan 001 is complete: `src/pages/admin.astro` has no `unpkg.com` or `esm.sh` imports.
- [ ] `vercel.json` uses `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`.
- [ ] `vercel.json` no longer allows `https://unpkg.com` or `https://esm.sh`.
- [ ] `frame-ancestors 'none'` remains in the enforced policy.
- [ ] `pnpm exec astro build` exits 0.
- [ ] `pnpm exec playwright test tests/playwright/basic.spec.ts tests/playwright/blog-search.spec.ts` passes.
- [ ] `pnpm run lint` exits 0.
- [ ] No out-of-scope files are modified (`git status --short`).
- [ ] `plans/README.md` row for Plan 002 is updated.

## STOP conditions

Stop and report back if:

- Plan 001 has not landed and `/admin` still imports remote CDN scripts.
- Enforcing the CSP breaks core routes in a way that requires adding wildcards like `script-src *` or `connect-src *`.
- Fixing CSP violations requires changing application behavior outside `vercel.json`.
- You cannot validate that `vercel.json` remains valid JSON.

## Maintenance notes

This plan is a first enforcement step, not a perfect CSP. Future hardening can replace `'unsafe-inline'` with nonces/hashes, but that should be a separate plan because the site currently has intentional inline scripts for first-paint theme/accessibility preferences. Reviewers should compare the final CSP against actual runtime needs and reject any broad wildcard allowances.
