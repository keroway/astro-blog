# Vercel Preview Deployment 運用ガイド

- **関連 ADR**: [0002 — CMS: Keystatic 採用](./adr/0002-cms.md)、[0003 — レンダリング戦略: SSG 継続](./adr/0003-rendering-strategy.md)、[0005 — Keystatic admin ランタイム](./adr/0005-keystatic-admin-runtime.md)
- **関連 Issue**: [#34 プレビュー機能とデプロイフローの設計](https://github.com/keroway/astro-blog/issues/34) / [#100 Vercel Preview Deployment と CMS の連携を検証する](https://github.com/keroway/astro-blog/issues/100)
- **作成日**: 2026-05-23

---

## 1. このドキュメントの位置付け

`docs/cms-flow.md` は「編集 → プレビュー → 本番反映」の全体フローを扱う。本ドキュメントは **Vercel Preview Deployment 側だけ** にスコープを絞り、運用時に参照する設定・挙動・検証手順をまとめる。Keystatic 編集フローや本番有効化手順は [cms-flow.md](./cms-flow.md) を参照。

---

## 2. Preview Deployment の挙動

GitHub に PR を作ると Vercel が自動でビルドし、PR ブランチ専用の Preview URL を発行する。URL のフォーマットは次の通り:

```
https://astro-blog-git-<sanitized-branch>-keroway.vercel.app/
```

- ブランチ名の `/` は `-` に正規化され、長さ制限を超える場合はハッシュサフィックスが付く。
- Vercel が GitHub PR にコメント形式で URL を自動投稿する。
- PR を main にマージするまで本番 (`keroway.com`) には反映されない。

### Preview では Keystatic を mount しない

`astro.config.mjs` は `VERCEL_ENV` を見て統合構成を切り替えている。Preview 時は **Keystatic 統合自体を外す** ため、Preview URL の `/keystatic` は **404** になる。

```
production → React + Keystatic を有効化 (GitHub mode 強制)
preview    → Keystatic を mount しない (/keystatic は 404)
local dev  → Keystatic を有効化 (local mode で従来通り)
```

該当ロジック: `astro.config.mjs:30-39`

> **なぜ Preview で編集禁止にしているか:** Preview の Vercel Function は ephemeral filesystem で、local モードのまま起動すると Admin UI が「保存できた」と返したのにマージ後の本番には何も残らない、というデータロストが起きる。Production 環境の fail-fast ガード (`astro.config.mjs:20-28`) と対になる設計判断 (ADR 0005 参照)。

---

## 3. 環境変数

Preview 環境では **Keystatic 関連の env を Vercel 側に設定する必要がない**。統合が mount されていないため、`PUBLIC_KEYSTATIC_STORAGE_KIND` などが未設定でも build は通る。

| 変数名 | Vercel Production | Vercel Preview | 補足 |
|--------|------------------|----------------|------|
| `PUBLIC_KEYSTATIC_STORAGE_KIND` | `github` (必須) | 不要 | Production で未設定だと `astro.config.mjs:20-28` が build を fail させる |
| `KEYSTATIC_GITHUB_CLIENT_ID` | 必須 | 不要 | GitHub App の Client ID |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | 必須 (Encrypted) | 不要 | 同 Secret |
| `KEYSTATIC_SECRET` | 必須 (Encrypted) | 不要 | セッション署名用乱数 |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | 必須 | 不要 | Admin UI が App インストール画面に遷移する slug |
| `VERCEL_DEPLOY_HOOK_URL` | 必須 (公開予約用) | 不要 | `/api/trigger-build` が POST する Deploy Hook URL |
| `CRON_SECRET` | 必須 (Encrypted, 公開予約用) | 不要 | Vercel Cron からの呼び出しを認証する Bearer トークン |

サンプルは [.env.example](../.env.example) を参照。

> Vercel ダッシュボードで env を登録するときは、対象環境のチェックを **Production のみ** にしておけば Preview に余計な値が漏れない。

---

## 4. draft / 公開予約フィルタの実装

本番ビルドで draft 記事と未来日記事が確実に除外されることを保証しているのは、以下 3 箇所の `getCollection` フィルタである。

| ファイル | フィルタ |
|---------|---------|
| `src/pages/blog/index.astro:9` | `!data.draft && data.pubDate <= now` |
| `src/pages/index.astro:11` | `!data.draft && data.pubDate <= now` |
| `src/pages/rss.xml.js:9` | `!data.draft && data.pubDate <= now` |

- `draft: true` の記事はビルド時点で一覧・トップ・RSS から除外され、個別ページ (`/blog/<slug>/`) も生成されないため 404 になる。
- `pubDate` が未来日の記事も同様に除外される。これにより公開予約フローでは「`draft: false` + 未来 `pubDate`」のまま PR をマージしても本番には出ない。

Preview ビルドでは **同じフィルタが走る**。Preview で draft 記事を確認したい場合は、後述する「draft フラグを一時的に外すブランチを切る」フローに従う。

---

## 5. ドラフトを Preview で確認する手順

### パターン A: Keystatic で書く (推奨)

1. ローカルまたは本番 Admin UI (`https://keroway.com/keystatic`) で記事を作成する。
2. Keystatic が `keystatic/<slug>` ブランチに自動で commit する。
3. そのブランチで PR を作成する (Keystatic UI から「Create pull request」)。
4. Vercel が Preview URL を発行する。URL の `/blog/<slug>/` でドラフトを確認する。
   - **記事に `draft: true` が付いている場合は 404 になる**。Preview でも production と同じフィルタが効くため。
   - Preview で見たいときは Keystatic 側で `draft: false` に切り替えて再 commit するか、後述のパターン B に従って手動で frontmatter を変更する。

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
pnpm run dev
curl http://localhost:4321/api/trigger-build
```

---

## 7. 実機検証ログ

| 検証項目 | 結果 | 確認方法 |
|---------|------|---------|
| Preview URL でドラフト記事が **404 になる** (draft フィルタが効く) | ✅ | パターン B で `draft: true` の記事を作成 → Preview URL でアクセス |
| `draft: false` に切り替えると同じ Preview URL で記事が表示される | ✅ | 同 PR の追加 commit で frontmatter 書き換え |
| 本番 (`keroway.com`) には検証用記事が出ない | ✅ | PR を main にマージしないまま close + delete-branch |
| ローカル build (`pnpm exec astro build`) で draft 記事が `dist/` に含まれない | ✅ | `grep -r "<slug>" dist/` でヒット 0 |
| `VERCEL_ENV=preview` で `/keystatic` が 404 になる | ✅ | Preview URL の `/keystatic` にアクセス |
| 本番 fail-fast ガード (`PUBLIC_KEYSTATIC_STORAGE_KIND` 未設定で build fail) | ✅ | PR #165 / PR #171 で検証済 |

詳細な検証ログ (Preview URL / スクリーンショット / build 出力) は本ガイドを追加した PR の description に記載する。

---

## 8. 関連ドキュメント

- [docs/cms-flow.md](./cms-flow.md) — 編集 → プレビュー → 本番反映の全体フロー
- [docs/adr/0002-cms.md](./adr/0002-cms.md) — CMS 選定 (Keystatic 採用)
- [docs/adr/0003-rendering-strategy.md](./adr/0003-rendering-strategy.md) — レンダリング戦略 (SSG 継続)
- [docs/adr/0005-keystatic-admin-runtime.md](./adr/0005-keystatic-admin-runtime.md) — Keystatic admin ランタイム (Vercel adapter + hybrid 出力)
- [Vercel — Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Vercel — Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs)
