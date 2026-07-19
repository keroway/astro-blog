<!-- markdownlint-disable MD013 MD060 -->

# Plan 008: axe が検出する color-contrast (serious) 違反を解消する

> **Executor instructions**: Follow this plan step by step. Run every verification command before moving on. On any STOP condition, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- src/components/Header.astro src/components/Monogram.astro src/components/RecentNoteCard.astro src/styles/tokens.css`
> 一致しない場合は "Current state" と実コードを突き合わせてから進めること。

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: accessibility (WCAG 1.4.3)
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Why this matters

サイトは a11y メニューや admin の axe テストを整備済みだが、**公開ページ本体**に axe (wcag2aa) の color-contrast **serious** 違反が残っている。検証時の実測（ビルド済みサイトに対する `@axe-core/playwright`, tags: wcag2a/2aa/21aa/22aa）:

- **light テーマ（全ページ、5〜10 ノード）**: `.kw-header__link-num`（ヘッダーナビの `01`〜`04` 番号、`--kw-accent` = sand を紙色地に使用）。
- **dark テーマ**: `.kw-monogram__tag`（フッターのモノグラム脇のタグ文字、全ページ）、`.recent-note__stamp`（トップの featured カードのスタンプ）。

## Current state

- `src/components/Header.astro`: `.kw-header__link-num { color: var(--kw-accent); }` — sand `oklch(78.89% 0.0875 73.37)` を paper 地に載せておりコントラスト比が 3:1 未満。
- `src/components/Monogram.astro` の `.kw-monogram__tag`、`src/components/RecentNoteCard.astro` の `.recent-note__stamp` が dark テーマで不足。

## Commands you will need

| Purpose | Command | Expected |
|---|---|---|
| Build | `pnpm run build` | exit 0 |
| axe 検証 | 一時スクリプトで dist/client を配信し `@axe-core/playwright` を light/dark × 主要 5 ページ（`/`, `/blog/`, 記事 1 本, `/works/`, `/about/`）に実行 | color-contrast 違反 0 |
| Lint (CI ゲート) | `pnpm run lint` | exit 0 |
| Alt テキスト検査 (CI ゲート) | `pnpm run lint:alt` | exit 0 |

## Scope

**In scope**:

- `src/styles/tokens.css`（必要ならテキスト用の派生トークン追加、例 `--kw-accent-text`）
- `src/components/Header.astro` / `Monogram.astro` / `RecentNoteCard.astro` の色参照
- 恒久化する場合: `tests/playwright/` に公開ページ向け axe smoke（admin-a11y.spec.ts のパターンを流用）

**Out of scope**:

- パレット全体の再設計。ブランド色 `--kw-accent`（背景・罫線用途）はそのまま。
- admin ページ。

## Steps

### Step 1: テキスト用アクセントトークンを導入する

`tokens.css` に「小さい文字に使ってよい」暗めの sand 派生を追加する。例:

```css
/* light */
--kw-accent-text: oklch(from var(--kw-sand) 52% c h);
/* dark: 明るい側へ寄せる */
--kw-accent-text: oklch(from var(--kw-sand) 82% c h);
```

数値は目安。**paper 地 / navy 地それぞれで 4.5:1 以上**（対象は 12〜13px 相当の小さい文字なので large-text 例外は使わない）を満たすよう調整する。

### Step 2: 違反ノードの色参照を差し替える

- `Header.astro` `.kw-header__link-num` → `var(--kw-accent-text)`
- `Monogram.astro` `.kw-monogram__tag` / `RecentNoteCard.astro` `.recent-note__stamp` → dark テーマで不足しない色（`--kw-accent-text` か `--kw-fg-muted`）へ。

装飾性を保ちたい場合でも、視認テキストである以上コントラストを満たすこと（aria-hidden で逃げない）。

### Step 3: axe で再検証し、可能なら回帰テスト化する

light/dark × 5 ページで color-contrast 違反 0 を確認。`tests/playwright/` に公開ページの axe smoke を追加できれば追加する（`test:admin` と同様の起動方法）。

## Done criteria

- [ ] light/dark × `/`, `/blog/`, 記事, `/works/`, `/about/` で axe color-contrast 違反 0。
- [ ] デザイン上のトーン（sand の帯・罫線・チップ背景）は維持されている（スクリーンショット目視）。
- [ ] `pnpm run build` / `pnpm run lint` exit 0。
- [ ] `plans/README.md` の Plan 008 行を更新。

## STOP conditions

- トークン調整で他コンポーネント（chip / seal / status pill）の見た目が明らかに劣化する場合 → 対象を違反ノード限定の色指定に切り替えて報告。
- axe が新たな別カテゴリの violation を報告した場合は本 plan では触らず記録のみ。
