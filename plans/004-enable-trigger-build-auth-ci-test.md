<!-- markdownlint-disable MD013 MD060 -->

# Plan 004: Run the trigger-build auth regression in CI

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md` — unless a reviewer dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat b6f26a6..HEAD -- src/pages/api/trigger-build.ts tests/playwright/url-check.spec.ts playwright.config.ts .github/workflows/ci.yml docs/vercel-preview.md`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `b6f26a6`, 2026-06-28

## Why this matters

`/api/trigger-build` is the one on-demand server route in an otherwise static site. It protects the Vercel deploy hook with `CRON_SECRET`, but the existing Playwright test skips in normal CI because `CRON_SECRET` is not set in the test job. That means a future refactor could accidentally remove or bypass the auth check without CI catching it. This plan makes CI exercise the unauthorized path using a dummy test secret, without exposing real production secrets or calling the deploy hook.

## Current state

Relevant files:

- `src/pages/api/trigger-build.ts` — API route under test.
- `tests/playwright/url-check.spec.ts` — contains a skipped auth regression.
- `playwright.config.ts` — Playwright webServer inherits environment from the Playwright process.
- `.github/workflows/ci.yml` — E2E job runs Playwright in CI.
- `docs/vercel-preview.md` — documents production `CRON_SECRET` / deploy hook setup; update only if test behavior docs need a small note.

Current route behavior, `src/pages/api/trigger-build.ts:6-20`:

```ts
const cronSecret = import.meta.env.CRON_SECRET;

if (!cronSecret) {
  if (import.meta.env.PROD) {
    return new Response("CRON_SECRET is not configured", { status: 500 });
  }
  // ローカル dev は認証をスキップ（.env.example 参照）
} else {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
}
```

Current skipped test, `tests/playwright/url-check.spec.ts:84-99`:

```ts
test("/api/trigger-build returns 401 when CRON_SECRET is set and token is wrong", async ({
  request,
}) => {
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "CRON_SECRET not set — skipping auth check");

  const res = await request.get("/api/trigger-build", {
    headers: { Authorization: "Bearer wrongtoken" },
  });
  expect(res.status(), "wrong token should return 401").toBe(401);
});
```

Current CI E2E command, `.github/workflows/ci.yml:178-179`:

```yaml
- name: Run Playwright tests
  run: pnpm exec playwright test
```

Repo conventions to match:

- CI uses plain YAML env blocks and keeps permissions read-only.
- Test comments are Japanese where they explain repo-specific behavior.
- Do not use real secret values in committed files; dummy test values are acceptable when clearly fake.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Targeted local auth test | `CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts --grep "trigger-build"` | test passes; no deploy hook call |
| Full URL smoke | `CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts` | all tests pass |
| Typecheck | `pnpm exec astro check` | exit 0; 0 errors |
| Lint | `pnpm run lint` | exit 0 |
| YAML sanity | `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci.yml'); puts 'ok'"` | prints `ok` |

## Scope

**In scope** (the only files you should modify):

- `.github/workflows/ci.yml`
- `tests/playwright/url-check.spec.ts`
- `docs/vercel-preview.md` only for a short note if needed

**Out of scope**:

- Changing production `CRON_SECRET` or `VERCEL_DEPLOY_HOOK_URL` values.
- Calling the real Vercel deploy hook in tests.
- Changing `/api/trigger-build` response body or success behavior.
- Adding new secrets to GitHub Actions.

## Git workflow

- Branch: `advisor/004-enable-trigger-build-auth-ci-test`
- Commit message style: short imperative Japanese, e.g. `再ビルド API の認証テストを CI で有効化`
- Do not push or open a PR unless instructed by the operator.

## Steps

### Step 1: Make the existing test assert only the unauthorized boundary

Keep the test focused on the wrong-token path. It must not require `VERCEL_DEPLOY_HOOK_URL`, because the route returns `401` before it reads or fetches the deploy hook when the token is wrong.

Optionally strengthen the test by adding a missing-token assertion under the same `CRON_SECRET` condition:

```ts
const missing = await request.get("/api/trigger-build");
expect(missing.status(), "missing token should return 401").toBe(401);
```

Keep `test.skip(!process.env.CRON_SECRET, ...)` so local runs without the env var remain convenient.

**Verify**:

```bash
CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts --grep "trigger-build"
```

Expected: selected test passes. It should not attempt a real deploy hook request.

### Step 2: Pass a dummy secret to the CI E2E job

In `.github/workflows/ci.yml`, update the `Run Playwright tests` step to set a fake env var:

```yaml
- name: Run Playwright tests
  env:
    CRON_SECRET: ci-test-secret
  run: pnpm exec playwright test
```

Do not use `${{ secrets.CRON_SECRET }}`. This test intentionally needs only a dummy value so fork PRs and Dependabot PRs can run without privileged secrets.

**Verify**:

```bash
ruby -e "require 'yaml'; YAML.load_file('.github/workflows/ci.yml'); puts 'ok'"
```

Expected: prints `ok`.

### Step 3: Run the full URL smoke locally with the dummy secret

Run:

```bash
CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts
```

Expected: all tests in `url-check.spec.ts` pass. This command may require `dist/client/sitemap-index.xml` to exist because the suite checks build artifacts; if missing, run `pnpm exec astro build` first and repeat.

### Step 4: Run typecheck and lint

Run:

```bash
pnpm exec astro check
pnpm run lint
```

Expected: both exit 0.

### Step 5: Add a short docs note only if helpful

If `docs/vercel-preview.md` currently implies the auth test needs a real secret, add one sentence near the CRON_SECRET testing section explaining that CI uses a dummy `CRON_SECRET=ci-test-secret` only to exercise the unauthorized path and never calls the deploy hook.

Do not include real secret values or production hook URLs.

**Verify**: if docs changed, `pnpm run lint` still exits 0 (Biome covers JSON/TS/JS; markdown is not formatted by Biome, so keep the diff minimal).

## Test plan

- Existing test file: `tests/playwright/url-check.spec.ts`.
- Cover these cases when `CRON_SECRET` is set:
  - wrong bearer token returns 401
  - optional: missing bearer token returns 401
- Do not test the success path in CI; success would require `VERCEL_DEPLOY_HOOK_URL` and could trigger a deploy.

## Done criteria

All must hold:

- [ ] CI E2E step sets `CRON_SECRET: ci-test-secret` directly in the workflow step.
- [ ] No real secret or deploy hook URL is committed.
- [ ] `CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts --grep "trigger-build"` passes.
- [ ] `CRON_SECRET=ci-test-secret pnpm exec playwright test tests/playwright/url-check.spec.ts` passes, after `pnpm exec astro build` if needed for sitemap artifacts.
- [ ] `pnpm exec astro check` exits 0.
- [ ] `pnpm run lint` exits 0.
- [ ] No out-of-scope files are modified (`git status --short`).
- [ ] `plans/README.md` row for Plan 004 is updated.

## STOP conditions

Stop and report back if:

- The wrong-token test attempts to read `VERCEL_DEPLOY_HOOK_URL` or call the deploy hook.
- Astro dev does not expose `CRON_SECRET` from the Playwright process environment to `import.meta.env.CRON_SECRET`.
- Making the test pass appears to require committing a real secret or using GitHub encrypted secrets.
- `url-check.spec.ts` has changed so the current-state excerpt is no longer recognizable.

## Maintenance notes

This plan intentionally tests only the unauthorized boundary in CI. A production success-path smoke test should be manual or run in a controlled deployment environment because it can trigger a real Vercel build. Reviewers should verify that the workflow uses a clearly fake dummy value and that no real secret names/values were added beyond the existing environment variable names.
