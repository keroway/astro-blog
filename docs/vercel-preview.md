# Vercel Preview Deployment 運用ガイド

- **関連 ADR**: [0016 — CMS: Sveltia CMS 移行](./adr/0016-cms-keystatic-to-sveltia.md)、[0003 — レンダリング戦略: SSG 継続](./adr/0003-rendering-strategy.md)
- **関連 Issue**: [#34 プレビュー機能とデプロイフローの設計](https://github.com/keroway/astro-blog/issues/34) / [#100 Vercel Preview Deployment と CMS の連携を検証する](https://github.com/keroway/astro-blog/issues/100)
- **作成日**: 2026-05-23（ADR 0016 の Sveltia 移行後に全面改訂）

---

## 1. このドキュメントの位置付け

`docs/cms-flow.md` は「編集 → プレビュー → 本番反映」の全体フローを扱う。本ドキュメントは **Vercel Preview Deployment 側だけ** にスコープを絞り、運用時に参照する設定・挙動・検証手順をまとめる。CMS 編集フローや本番有効化手順は [cms-flow.md](./cms-flow.md) を参照。

---

## 2. Preview Deployment の挙動

GitHub に PR を作ると Vercel が自動でビルドし、PR ブランチ専用の Preview URL を発行する。URL のフォーマットは次の通り:

```
https://astro-blog-git-<sanitized-branch>-keroway.vercel.app/
```

- ブランチ名の `/` は `-` に正規化され、長さ制限を超える場合はハッシュサフィックスが付く。
- Vercel が GitHub PR にコメント形式で URL を自動投稿する。
- PR を main にマージするまで本番 (`keroway.com`) には反映されない。

### Preview の `/admin` (Sveltia CMS) の扱い

Sveltia CMS は `src/pages/admin.astro` + `public/admin/config.yml` による**完全に静的な SPA** で、Astro 統合や Vercel Function を持たない (ADR 0016)。そのため Keystatic 時代のような「Preview では CMS を mount しない」という環境分岐は存在せず、Preview URL でも `/admin` 自体は配信される。

- 本番編集は `https://keroway.com/admin` の OAuth (Cloudflare Workers の `sveltia-cms-auth`) 経由でのみ行う。Preview URL の `/admin` から編集を始めない (OAuth のリダイレクト先は本番ドメイン前提)。
- 旧 `/keystatic` パスは `vercel.json` の redirects で `/admin` へ永続リダイレクトされる。
- `/admin` と `/api` には `X-Robots-Tag: noindex, nofollow` が付与される (`vercel.json` の headers)。

---

## 3. 環境変数

Sveltia CMS は静的 SPA のため、CMS 用のサーバーサイド env は Production / Preview とも**不要**。Vercel に登録するのは公開予約フロー用の 2 つだけ。

| 変数名 | Vercel Production | Vercel Preview | 補足 |
|--------|------------------|----------------|------|
| `VERCEL_DEPLOY_HOOK_URL` | 必須 (公開予約用) | 不要 | `/api/trigger-build` が POST する Deploy Hook URL |
| `CRON_SECRET` | 必須 (Encrypted, 公開予約用) | 不要 | Vercel Cron からの呼び出しを認証する Bearer トークン |

サンプルは [.env.example](../.env.example) を参照。OAuth プロキシ (Cloudflare Workers `sveltia-cms-auth`) 側の設定は [cms-flow.md](./cms-flow.md) を参照。

> Vercel ダッシュボードで env を登録するときは、対象環境のチェックを **Production のみ** にしておけば Preview に余計な値が漏れない。

---

## 4. draft / 公開予約フィルタの実装

本番ビルドで draft 記事と未来日記事が確実に除外されることを保証しているのは、`src/lib/content.ts` の `getPublishedPosts()` (`!data.draft && data.pubDate <= now`) である。トップ・blog 一覧・RSS (`rss.xml` / `feed.xml` / `works/rss.xml`)・`llms.txt`・OG 画像生成など、公開記事を列挙する箇所はすべてこの関数を経由する。

- `draft: true` の記事はビルド時点で一覧・トップ・RSS から除外され、個別ページ (`/blog/<slug>/`) も生成されないため 404 になる。
- `pubDate` が未来日の記事も同様に除外される。これにより公開予約フローでは「`draft: false` + 未来 `pubDate`」のまま PR をマージしても本番には出ない。

Preview ビルドでは **同じフィルタが走る**。Preview で draft 記事を確認したい場合は、後述する「draft フラグを一時的に外すブランチを切る」フローに従う。

---

## 5. ドラフトを Preview で確認する手順

### パターン A: Sveltia CMS で書く (推奨)

1. ローカル (`pnpm run dev:astro` → `http://localhost:4321/admin`、File System Access API 対応の Chromium 必須) または本番 Admin UI (`https://keroway.com/admin`) で記事を作成する。
2. Sveltia は main ブランチへ直接 commit する運用のため、Preview で確認したい記事は**先に検証用ブランチを切ってから** commit するか、後述のパターン B に従う (Sveltia は Editorial Workflow 未対応、[cms-flow.md](./cms-flow.md) 参照)。
3. そのブランチで PR を作成すると Vercel が Preview URL を発行する。URL の `/blog/<slug>/` でドラフトを確認する。
   - **記事に `draft: true` が付いている場合は 404 になる**。Preview でも production と同じフィルタが効くため。
   - Preview で見たいときは `draft: false` に切り替えて再 commit する。

### パターン B: 手動ブランチで検証する

実機検証や draft フィルタの動作確認に使う、本ドキュメントが推奨する手順。

```bash
# 1. 検証用ブランチを切る
git checkout -b chore/preview-verify

# 2. src/content/blog/_check.md を作って draft: true で書く
# 3. ローカルで本番除外を確認
pnpm exec astro build
grep -r "_check" dist/    # 何も出なければ OK

# 4. PR を投げる (draft PR 推奨)
git add . && git commit -m "test: preview verification"
git push -u origin chore/preview-verify
gh pr create --draft --title "test: preview verification" --body "draft check"

# 5. Vercel が発行した Preview URL でアクセス
#    https://astro-blog-git-chore-preview-verify-keroway.vercel.app/blog/_check/
#    → 404 になることを確認 (draft フィルタが Preview にも効いているため)

# 6. frontmatter を draft: false に変更して push
#    → 同じ Preview URL で記事が表示されることを確認

# 7. 検証が終わったら PR を close + ブランチ削除 (main にマージしない)
gh pr close --delete-branch
```

> **重要:** 検証用ブランチは **絶対に main にマージしない**。マージすると検証用記事が本番に出る。検証が終わったら必ず close + delete-branch する。

---

## 6. Deploy Hook と公開予約 Cron

`vercel.json` の `crons` 設定で、`/api/trigger-build` が毎日 UTC 0:00 (JST 9:00) に呼ばれる。エンドポイントの実装は `src/pages/api/trigger-build.ts`。

### フロー

```
Vercel Cron (UTC 00:00)
  → GET /api/trigger-build (Bearer CRON_SECRET)
  → fetch VERCEL_DEPLOY_HOOK_URL (POST)
  → Vercel が本番ビルドをトリガー
  → astro build (pubDate <= now の記事のみ含む)
  → keroway.com に反映
```

### Deploy Hook URL の発行方法

1. Vercel Dashboard → Project → Settings → Git → **Deploy Hooks**
2. Hook Name: `Scheduled Publish` / Branch: `main` で作成
3. 発行された URL を Vercel の環境変数 `VERCEL_DEPLOY_HOOK_URL` に Production 環境向けに登録 (Encrypted 推奨)

### CRON_SECRET の生成と登録

```bash
openssl rand -hex 32
```

生成した値を Vercel の Production 環境変数 `CRON_SECRET` に Encrypted で登録する。`/api/trigger-build` は `Authorization: Bearer $CRON_SECRET` を検証する (`src/pages/api/trigger-build.ts:9`)。未設定の場合は認証スキップ (ローカル開発向け fallback)。

### テスト発火

```bash
# Production を実際に再ビルドする (要 CRON_SECRET)
curl -H "Authorization: Bearer $CRON_SECRET" https://keroway.com/api/trigger-build

# ローカルで動作確認 (CRON_SECRET 未設定なら認証スキップ)
pnpm run dev:astro
curl http://localhost:4321/api/trigger-build
```

---

## 7. 実機検証ログ

draft フィルタ関連は Keystatic 時代 (2026-05-23) の検証記録。フィルタ実装は `src/lib/content.ts` へ集約されたが挙動は同一。Keystatic 固有の 2 項目 (`/keystatic` 404、fail-fast ガード) は ADR 0016 の移行に伴い**現行構成には存在しない**。

| 検証項目 | 結果 | 確認方法 |
|---------|------|---------|
| Preview URL でドラフト記事が **404 になる** (draft フィルタが効く) | ✅ | パターン B で `draft: true` の記事を作成 → Preview URL でアクセス |
| `draft: false` に切り替えると同じ Preview URL で記事が表示される | ✅ | 同 PR の追加 commit で frontmatter 書き換え |
| 本番 (`keroway.com`) には検証用記事が出ない | ✅ | PR を main にマージしないまま close + delete-branch |
| ローカル build (`pnpm exec astro build`) で draft 記事が `dist/` に含まれない | ✅ | `grep -r "<slug>" dist/` でヒット 0 |

詳細な検証ログ (Preview URL / スクリーンショット / build 出力) は本ガイドを追加した PR の description に記載する。

---

## 8. 関連ドキュメント

- [docs/cms-flow.md](./cms-flow.md) — 編集 → プレビュー → 本番反映の全体フロー
- [docs/adr/0016-cms-keystatic-to-sveltia.md](./adr/0016-cms-keystatic-to-sveltia.md) — CMS 選定 (Sveltia CMS 移行)
- [docs/adr/0003-rendering-strategy.md](./adr/0003-rendering-strategy.md) — レンダリング戦略 (SSG 継続)
- [Vercel — Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Vercel — Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs)
