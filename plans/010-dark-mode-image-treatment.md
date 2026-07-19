<!-- markdownlint-disable MD013 MD060 -->

# Plan 010: ダークテーマでの画像のまぶしさを抑える

> **Executor instructions**: Follow this plan step by step. On any STOP condition, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- src/styles/global.css src/components/RecentNoteCard.astro src/components/WorksCard.astro src/layouts/BlogPost.astro src/layouts/WorkEntryLayout.astro`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: visual design
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Why this matters

ダークテーマの紺地に対して、記事・works のヒーロー画像の多くは**白背景のスクリーンショット**（Packt のページ、Jupyter、Timeline DSL の light UI など）で、画面内で強く発光して見える。トップの featured カード・works グリッド・記事ヒーロー・本文内画像すべてで顕著（スクリーンショット検証済み: `home-desktop-dark`, `post-real-desktop-dark`, `work-desktop-dark`）。

ダークモードの定石として、写真・スクリーンショットは輝度と彩度をわずかに落とすと目の負担と「白い矩形の浮き」が減る。

## Approach

`global.css` にダークテーマ限定の一括ルールを追加する（画像ごとの調整はしない）:

```css
[data-theme="dark"] :where(.post__content img, .post__hero img,
  .recent-note__media img, .works-card__media img, .work-entry__hero img) {
  filter: brightness(0.85) contrast(1.02);
}
```

- セレクタは実クラス名に合わせて調整（`RecentNoteCard` / `WorksCard` / `WorkEntryLayout` の media 要素を実査すること)。
- SVG ロゴ類・OG 画像には適用しない。
- `transition: filter` は付けない（テーマ切替時のちらつき防止は不要、コスト増のみ）。
- ホバーで原寸確認したいケースは考慮不要（閲覧用途のみ）。

## Scope

**In scope**: `src/styles/global.css`（または各コンポーネントの style）へのダークテーマ用 filter 追加のみ。

**Out of scope**: 画像アセット自体の差し替え、dark 用別画像の仕組み（`<picture>` の prefers-color-scheme ソース分岐）— 将来案として README に記録するだけでよい。

## Steps

1. 対象コンポーネントの img 要素のクラス構造を確認し、ルールを 1 箇所（global.css）に追加。
2. `pnpm run build` → dark テーマで `/`, `/blog/<記事>`, `/works/`, works 詳細をスクリーンショット確認。light テーマに影響がないことも確認。
3. Lighthouse CI（`pnpm run test:lighthouse`）が既存基準を割らないこと。

## Done criteria

- [ ] dark テーマで白背景スクリーンショットの発光感が緩和されている（before/after スクリーンショット添付）。
- [ ] light テーマの描画に変化がない。
- [ ] `pnpm run build` / `pnpm run lint` / `pnpm run lint:alt` exit 0。
- [ ] `plans/README.md` の Plan 010 行を更新。

## STOP conditions

- filter 適用で CLS や描画パフォーマンスの悪化が計測された場合。
- 対象セレクタが特定できないほど media 構造が変わっていた場合。
