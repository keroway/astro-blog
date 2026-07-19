<!-- markdownlint-disable MD013 MD060 -->

# Plan 009: ブログ一覧の絞り込みを「現在ページ内のみ」から全記事対象にする

> **Executor instructions**: Follow this plan step by step. On any STOP condition, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- "src/pages/blog/[...page].astro" src/components/PostRow.astro`

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MEDIUM
- **Depends on**: 007（同ファイルを触るため、先に 007 を完了させること）
- **Category**: UX
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Why this matters

`/blog` のカテゴリ・年フィルタは全記事から選択肢を生成する一方、**絞り込み自体は現在ページに描画された 20 件（`PAGE_SIZE`）にしか効かない**。

現状の具体的な問題:

1. 「読書」を選んでも表示されるのはページ 1 に載っている読書記事だけ。件数表示（`N 件`）も全体件数ではなくページ内件数で、ユーザーの期待（全 52 件からの絞り込み）とズレる。
2. 該当 0 件時の空メッセージが「他のページもご確認ください」と手動探索を促しており、UI がやることをユーザーに転嫁している。
3. `?category=` クエリはページネーションリンク（`新しい記事` / `古い記事`）に引き継がれず、ページ移動で絞り込みが暗黙に解除される。

## Current state

`src/pages/blog/[...page].astro`:

- `getStaticPaths` が `paginate(allPosts, { pageSize: 20 })` で静的ページ分割。
- クライアント JS `initFilter()` が `#posts-list .post-row` の `hidden` をトグルし、`history.pushState` で `?category=` / `?year=` を書き換える。
- `filter-bar` の選択肢は `allCategories` / `allYears`（全記事由来）。

## Approach（推奨案を明記した上で実装者が最終判断）

**推奨: 案 A — 静的アーカイブページ化**

- `/blog/category/[category]/`（および必要なら `/blog/year/[year]/`）を `getStaticPaths` で生成し、filter ボタンを JS トグルからこれらへの**リンク**に変える。
- 利点: JS 不要で全記事対象・URL 共有可能・SEO 整合（既存 `/blog/tags/` と同型）。ページネーションとの直交問題が消える（アーカイブは 1 ページ or 独自 paginate）。
- 既存の `?category=` URL は後方互換のためクライアント側で新 URL へリダイレクトするか、無視してよい（外部流入はほぼ想定されない）。

**代替: 案 B — 全記事インデックスの埋め込み**

- 全記事のメタ（title/href/date/category）を JSON で埋め込み、フィルタ時はページネーションを隠して全件から描画。実装は小さいが、一覧 DOM の二重管理と Pagefind 検索 UI との整合に注意。

どちらでも、空状態メッセージは「全文検索へ誘導」だけに簡素化する。

## Scope

**In scope**:

- `src/pages/blog/[...page].astro`（filter UI の置き換え）
- 案 A の場合: `src/pages/blog/category/[category].astro` 等の新規ルート、`src/lib/content.ts` のヘルパー追加
- sitemap / canonical の整合（新アーカイブは index 可、`BaseHead` の既定 canonical で足りるはず）
- `tests/playwright/` の filter 関連テスト更新・追加

**Out of scope**:

- タグページ (`/blog/tags/`) の変更
- Pagefind 検索の変更
- `PAGE_SIZE` の変更

## Steps（案 A 前提の概略）

1. `getPublishedPosts` を category / year で引くヘルパーを `src/lib/content.ts` に追加（unit テスト付き）。
2. `/blog/category/[category]/index.astro` を追加し、PostRow で全該当記事を列挙（件数が多ければ paginate）。`SectionHead` に件数を表示。
3. `[...page].astro` の filter ボタンをアーカイブへのリンク化（`aria-pressed` ボタン → `aria-current` リンクに変更）。クライアント JS の filter ロジックと `filter-count` / `empty-message` を削除。
4. 年フィルタは利用価値を再評価し、残すなら同型の `/blog/year/[year]/` を追加、落とすなら UI から削除（判断を README 行に記録）。
5. Playwright: アーカイブページの表示・件数・ナビゲーションのテストを追加し、旧 filter テストを置き換え。

## Done criteria

- [ ] カテゴリ絞り込みが全記事を対象に機能し、URL で共有できる。
- [ ] ページ移動で絞り込みが暗黙解除される挙動が存在しない。
- [ ] `pnpm run build`（`astro check` 込み）/ `pnpm run lint` / `pnpm run lint:alt` / `pnpm run test:unit` exit 0。
- [ ] 関連 Playwright テストが pass。
- [ ] `plans/README.md` の Plan 009 行を更新（採用した案と年フィルタの判断を一行で記録）。

## STOP conditions

- 案 A でルート追加が既存の `/blog/[...slug]` ルーティングと衝突する場合。
- ビルド時間・ページ数が顕著に増える（例: 年×カテゴリの直積を作りたくなった）場合 — 直積はスコープ外。
