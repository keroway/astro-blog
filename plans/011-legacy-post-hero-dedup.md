<!-- markdownlint-disable MD013 MD060 -->

# Plan 011: 旧記事のヒーロー画像重複と裸 URL を整理する

> **Executor instructions**: Follow this plan step by step. On any STOP condition, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- src/content/blog src/layouts/BlogPost.astro scripts/`

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW（コンテンツ変更が主。レンダリングコードは原則触らない）
- **Depends on**: none
- **Category**: content / visual
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Why this matters

移行された 2017–2018 年の記事群で、記事ページの見た目を下げている 2 つの反復パターンがある（例: `/blog/getting-started-with-python-web-scraping/` で確認）:

1. **ヒーロー画像と本文 1 枚目の画像が同一** — 同じスクリーンショットがページ冒頭に 2 回表示される。ヒーローは `frontmatter.heroImage`、本文側は Markdoc 内の同じ画像参照。さらにヒーロー枠 (`.post__hero`) は横長比率のため、縦長スクリーンショットだと上下が切れて表示される。
2. **本文先頭の裸 URL** — 紹介対象のリンクが `https://...` の生テキスト行として置かれている。既存の `LinkCard.astro`（Markdoc タグとして利用可能か要確認）に置き換えると見た目と可読性が上がる。

## Approach

コンテンツ一括整理はスクリプト支援で行う（`scripts/` に既存の suggest-*/ backfill-* パターンあり）:

1. **検出スクリプト** `scripts/audit-hero-dup.ts` を追加:
   - 各 `.mdoc` について、`heroImage` と本文中の画像参照（最初の 1 枚）が同一ファイルを指すものを列挙。
   - 本文の先頭 3 ブロック以内にある裸 URL 行（`http` で始まる段落）を列挙。
   - 出力はファイル名 + 該当行のレポートのみ（自動書き換えはしない）。
2. **方針決定と修正**:
   - ヒーロー重複: 原則「本文側の重複画像を削除」（ヒーローを残す）。本文の文脈上その位置に画像が必要な記事は個別判断で「heroImage を外す」。
   - 裸 URL: markdoc.config.mjs に `linkcard` タグが定義済みなら置換、なければタグ定義を追加してから置換（`LinkCard.astro` の props と整合させる）。
3. `pnpm run build` で schema / markdoc エラーがないことを確認し、対象記事を数本目視。

## Scope

**In scope**:

- `scripts/audit-hero-dup.ts`（新規、レポートのみ）
- `src/content/blog/*.mdoc` の該当記事の frontmatter / 本文修正
- 必要なら `markdoc.config.mjs` への linkcard タグ追加

**Out of scope**:

- `BlogPost.astro` のヒーロー表示ロジック変更（切れ問題は本文側削除で実質解消するため。解消しない記事が多数残る場合のみ、`.post__hero` の `aspect-ratio`/max-height 調整を README に追記して別 plan 化）
- 記事本文の文章リライト

## Done criteria

- [ ] 検出スクリプトがレポートを出力し、対象記事一覧が plan 実行ログに残っている。
- [ ] ヒーロー重複記事で同一画像が 2 回表示されない。
- [ ] 対象記事の裸 URL が LinkCard（または少なくとも記述的リンクテキスト）になっている。
- [ ] `pnpm run build` / `pnpm run lint` / `pnpm run lint:alt` exit 0。
- [ ] `plans/README.md` の Plan 011 行を更新。

## STOP conditions

- 対象が 20 記事を超え、判断が必要なケースが多い場合 → レポートだけ提出して操作者の判断を仰ぐ。
- markdoc タグ追加が CMS（Sveltia）のスキーマ整合（plan 005 参照）に波及する場合。
