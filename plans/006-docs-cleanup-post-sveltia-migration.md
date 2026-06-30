<!-- markdownlint-disable MD013 MD040 MD060 -->

# Plan 006: Remove stale Keystatic / Astro 6 documentation left after the Sveltia migration

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4b5cba0..HEAD -- README.md public/admin/config.yml src/pages/admin.astro .env.example docs/adr/0002-cms.md docs/adr/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: docs / dx
- **Planned at**: commit `4b5cba0`, 2026-06-30

## Why this matters

After ADR 0016 (Sveltia CMS migration) and ADR 0017 (Astro 7 upgrade) landed, several documentation artefacts still describe the old setup. Stale comments mislead future contributors and agents that read documentation as ground truth. The changes are text-only with no code logic impact, so risk is minimal.

## Current state

Specific issues to fix:

1. **`README.md:38`** — The tech stack table says `Node.js >= 22.12.0（Astro 6 の要件、偶数 LTS）`. The project now runs Astro 7.

2. **`public/admin/config.yml:2-3`** — Comment says:

   ```
   # Sveltia CMS は src/pages/admin.astro から
   # CDN ロードされる静的 SPA。
   ```

   After Plan 001, the CMS script is bundled from npm (`@sveltia/cms`), not loaded from a CDN. The comment should reflect the actual implementation and refer to ADR 0016.

3. **`src/pages/admin.astro:2-3`** — Comment says:

   ```
   // Sveltia CMS — CDN 配信の静的 SPA。
   // Astro バージョンに依存しないため、Astro メジャーアップ時もここを変更不要。
   ```

   First line should say `npm bundle` not `CDN 配信`. Second line is still accurate but should reference ADR 0016.

4. **`.env.example`** — Contains Keystatic-related variable names (`KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET`, `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`, `PUBLIC_KEYSTATIC_STORAGE_KIND`) that are no longer used by any production code. These are defined at lines 17, 26–29 of `.env.example`. They should be removed to avoid misleading setup.

5. **`docs/adr/0002-cms.md:3`** — Status says `Accepted`. This ADR was superseded by ADR 0016. Its status should be updated to `Deprecated / Superseded by 0016`.

6. **`docs/adr/README.md`** — The index should reflect the updated status of ADR 0002. Check the current content for accuracy.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Typecheck | `pnpm exec astro check` | exit 0, 0 errors |
| Lint | `pnpm run lint` | exit 0 |
| Unit tests | `pnpm run test:unit` | all pass |

## Scope

**In scope** (the only files you should modify):

- `README.md`
- `public/admin/config.yml`
- `src/pages/admin.astro`
- `.env.example`
- `docs/adr/0002-cms.md`
- `docs/adr/README.md`
- `plans/README.md` (status update row only)

**Out of scope** (do NOT touch):

- `.env` (the actual local environment file — do not read, modify, or display its values).
- Any source code under `src/` other than `admin.astro`.
- Production behavior — these are documentation-only changes.
- `docs/adr/0005-keystatic-admin-runtime.md` — it is already marked `Deprecated`. No change needed unless you confirm a discrepancy.

## Git workflow

- Branch: `advisor/006-docs-cleanup`
- Commit message style: short Japanese imperative, e.g. `Sveltia 移行後のドキュメント整理`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Fix `README.md` Astro version reference

Find the line containing `Astro 6 の要件` in the tech stack table (currently `ランタイム` row) and update the reference from `Astro 6` to `Astro 7`.

**Verify**: `grep "Astro 6 の要件" README.md` → returns no matches.

### Step 2: Update the comment in `public/admin/config.yml`

Replace the two-line comment about CDN loading:

```yaml
# Sveltia CMS は src/pages/admin.astro から
# CDN ロードされる静的 SPA。Astro に依存しないためバージョンロックが発生しない。
```

With an accurate comment, e.g.:

```yaml
# Sveltia CMS は src/pages/admin.astro で @sveltia/cms npm パッケージから
# バンドルされる静的 SPA (ADR 0016 / Plan 001)。Astro に依存しないためバージョンロックが発生しない。
```

**Verify**: `grep -n "CDN ロード" public/admin/config.yml` → returns no matches.

### Step 3: Update the comment in `src/pages/admin.astro`

Replace the first comment line that says `CDN 配信の静的 SPA`:

```ts
// Sveltia CMS — CDN 配信の静的 SPA。
```

With:

```ts
// Sveltia CMS — @sveltia/cms npm パッケージからバンドルされる静的 SPA (ADR 0016)。
```

**Verify**: `grep -n "CDN 配信" src/pages/admin.astro` → returns no matches.

### Step 4: Remove stale Keystatic variables from `.env.example`

Remove the variable definitions for the Keystatic configuration keys. Based on the snapshot at planning time these are:

- `PUBLIC_KEYSTATIC_STORAGE_KIND`
- `KEYSTATIC_GITHUB_CLIENT_ID`
- `KEYSTATIC_GITHUB_CLIENT_SECRET`
- `KEYSTATIC_SECRET`
- `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`

Read `.env.example` to identify exact lines and any surrounding comments that are exclusive to Keystatic. Remove only those lines. Preserve `VERCEL_DEPLOY_HOOK_URL` and `CRON_SECRET` which are still in use.

**Verify**: `grep -n "KEYSTATIC" .env.example` → returns no matches.

### Step 5: Update ADR 0002 status

Open `docs/adr/0002-cms.md` and change the status line near the top from:

```
- **ステータス**: Accepted
```

to:

```
- **ステータス**: Deprecated / Superseded by [ADR 0016](./0016-cms-keystatic-to-sveltia.md)
```

**Verify**: `grep "ステータス.*Accepted" docs/adr/0002-cms.md` → returns no matches.

### Step 6: Sync the ADR index

Open `docs/adr/README.md` and confirm or update the entry for ADR 0002 to show `Deprecated / Superseded by 0016`. Check that ADR 0016 already appears with an `Accepted` status; if it is missing from the index, add it.

**Verify**: `grep -n "0002" docs/adr/README.md` shows the updated status.

### Step 7: Run the verification gate

1. `pnpm exec astro check`
2. `pnpm run lint`
3. `pnpm run test:unit`

**Verify**: All three commands exit 0.

## Done criteria

- [ ] `grep "Astro 6 の要件" README.md` returns no matches.
- [ ] `grep "CDN ロード" public/admin/config.yml` returns no matches.
- [ ] `grep "CDN 配信" src/pages/admin.astro` returns no matches.
- [ ] `grep -n "KEYSTATIC" .env.example` returns no matches.
- [ ] `grep "ステータス.*Accepted" docs/adr/0002-cms.md` returns no matches.
- [ ] `docs/adr/README.md` shows ADR 0002 as deprecated and ADR 0016 as Accepted.
- [ ] `pnpm exec astro check` exits 0 with 0 errors.
- [ ] `pnpm run lint` exits 0.
- [ ] `pnpm run test:unit` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).

## STOP conditions

Stop and report back if:

- The excerpts in "Current state" no longer match the live files (codebase has drifted).
- Removing `.env.example` entries would break a CI step that validates its presence (verify with `grep -r "env.example" .github/` first; if CI reads it, add a comment instead of deleting).
- `pnpm exec astro check` fails after text-only changes — this is unexpected and signals something structural changed.

## Maintenance notes

When future migrations or major upgrades land, update status fields in the affected ADRs promptly. Stale `Accepted` status on superseded ADRs is the most common cause of confusion for agents reading docs as context. Keep `.env.example` in sync with every CMS/auth migration.
