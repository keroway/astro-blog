## 概要

<!-- この PR で何を・なぜ変えるのかを簡潔に。 -->

## 変更内容

-

## 関連 Issue

<!-- Closes #123 / Refs #123 -->

## 検証

`.claude/rules/implementation.md` の検証順序（`/ship-check` で E1〜E5 を一括実行可）。

- [ ] `pnpm run lint` — Biome lint + format check（`biome ci .`）
- [ ] `pnpm run lint:alt` — markdown 画像の alt テキスト lint（CI の lint ジョブでも常時実行）
- [ ] `pnpm run test:unit` — unit テスト（vitest）
- [ ] `pnpm exec astro check` — typecheck
- [ ] `pnpm exec astro build` — schema / build エラー
- [ ] `ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e` — E2E（Playwright）
- [ ] 1280 / 768 / 375 の 3 解像度で目視確認（ビジュアル変更時）

## スクリーンショット

<!-- ビジュアル変更がある場合は Before / After を貼る。 -->
