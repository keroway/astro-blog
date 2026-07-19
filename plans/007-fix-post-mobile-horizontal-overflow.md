<!-- markdownlint-disable MD013 MD060 -->

# Plan 007: モバイルの記事ページ横スクロール（レイアウト崩れ）を修正する

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- src/layouts/BlogPost.astro src/components/SectionHead.astro src/styles/global.css`
> If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (visual / responsive)
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Why this matters

390px ビューポート（iPhone 相当）で **コードブロックを含むすべての記事ページが横に大きくオーバーフローする**。検証時の実測値:

| URL | `document.scrollWidth` (期待 390) |
|---|---|
| `/blog/getting-started-with-python-web-scraping/` | **1218** |
| `/blog/apache-solr-1/` | **1026** |
| `/blog/nginx/` | **1546** |

`article.post` 全体（`h1.post__title`, `hr`, 本文 `p` まで）がコードブロックの最長行幅まで押し広げられ、本文を読むのに横スクロールが必要になる。モバイル読者にとって最も深刻な UX 欠陥。

**原因**: `.post` は `display: grid` で、grid item である `.post__content` に `min-width: 0` がない。`pre.astro-code` は `overflow-x: auto` を持つが、コピーボタン用 JS ラッパー `div.code-block`（overflow: visible）を経由するため、`pre` の max-content 幅（最長行）が `.post__content` の min-content 寄与としてトラックを押し広げる。`overflow-x: auto` はスクロールバーにならず、祖先の grid トラック自体が広がってしまう。

付随バグ: トップページ（`/`）でも `.kw-section-head__en` のアクションリンク「see all (52) →」が右端 414px まではみ出し、24px の横スクロールが出る（`.kw-section-head` が狭幅で折り返さない）。

## Current state

`src/layouts/BlogPost.astro`（style 内）:

```css
.post {
  display: grid;
  gap: var(--kw-space-8);
}
...
.post__content {
  color: var(--kw-fg);
  overflow-wrap: break-word;
  word-wrap: break-word;
  line-height: var(--kw-lh-prose);
}
.post__content :global(pre) {
  overflow-x: auto;
  max-width: 100%;
}
.post__content :global(.code-block) {
  position: relative;
}
```

`src/components/SectionHead.astro` は `.kw-section-head`（uno shortcut）+ action リンクを横並びで出す。狭幅での折り返し/縮小の指定がない。

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck + build | `pnpm run build` | exit 0 |
| Targeted E2E | `pnpm exec playwright test tests/playwright/ --grep "overflow"` | 追加テストが pass |
| Lint | `pnpm run lint` | exit 0 |
| Alt テキスト検査 (CI ゲート) | `pnpm run lint:alt` | exit 0 |

## Scope

**In scope**:

- `src/layouts/BlogPost.astro`（style のみ）
- `src/components/SectionHead.astro`（style のみ）または `uno.config.ts` の該当 shortcut
- `tests/playwright/` に回帰テスト 1 ファイル（または既存 spec への追記）

**Out of scope**:

- 記事コンテンツ（.mdoc）の変更
- コードブロックの折り返し（`white-space` 変更）— 横スクロールは `pre` 内で完結させる方針
- デスクトップレイアウトの変更

## Steps

### Step 1: grid item の min-width を修正する

`src/layouts/BlogPost.astro` の style に追加:

```css
.post > * {
  min-width: 0;
}
.post__content :global(.code-block) {
  position: relative;
  min-width: 0;
  max-width: 100%;
}
```

（`.post > *` が広すぎる場合は `.post__content, .post__header, .post__hero { min-width: 0 }` でも可。デスクトップの `.post-wrap` グリッド側は既に `minmax(0, 1fr)` なので変更不要。）

**Verify**: `pnpm run build` 後、下記のワンライナーで確認（またはブラウザ devtools で 390px 幅にして確認）:

- `/blog/getting-started-with-python-web-scraping/` の `document.documentElement.scrollWidth === 390`
- `pre` 自体は `scrollWidth > clientWidth` で内部スクロールになっていること

### Step 2: SectionHead のはみ出しを修正する

`.kw-section-head` の action リンクが狭幅で折り返す/縮むようにする。例:

```css
.kw-section-head { flex-wrap: wrap; }
.kw-section-head__en { min-width: 0; }
```

（shortcut が uno.config.ts にある場合はそちらを修正。トップページ 390px 幅で `scrollWidth === 390` になること。）

### Step 3: 回帰テストを追加する

Playwright テスト（例 `tests/playwright/no-horizontal-overflow.spec.ts`）:

- viewport 390×844 で `/`, `/blog/`, `/blog/getting-started-with-python-web-scraping/`, `/works/`, `/about/` を開く。
- 各ページで `document.documentElement.scrollWidth <= document.documentElement.clientWidth` をアサート。

**Verify**: `pnpm exec playwright test <追加した spec>` → pass。

## Done criteria

- [ ] 390px 幅で全対象ページの `scrollWidth <= clientWidth`。
- [ ] 長い行のコードブロックは `pre` 内の横スクロールで閲覧できる。
- [ ] デスクトップ（1440px）で post レイアウト / TOC サイドバーの見た目に変化がない。
- [ ] `pnpm run build` / `pnpm run lint` exit 0。
- [ ] 回帰テストが追加され pass。
- [ ] `plans/README.md` の Plan 007 行を更新。

## STOP conditions

- `min-width: 0` を入れても overflow が解消しない（原因が別にある）場合。
- 修正がデスクトップの TOC グリッドや View Transitions morph を壊す場合。
