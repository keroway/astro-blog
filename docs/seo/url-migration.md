# URL マイグレーション記録

## 概要

Issue #20（旧URLの維持とリダイレクト整備）および Issue #68（vercel.json redirects 整備と Search Console 対応）の実施結果を記録する。

## URL 互換性チェック結果（Issue #67 より）

`tests/playwright/url-check.spec.ts` による自動チェック（PR #105 にてマージ済み）で、全ブログ記事 URL（50件以上）が HTTP 200 を返すことを確認済み。

## リダイレクト要否判定

### 判定結果: **リダイレクト不要**

`vercel.json` への redirects 設定追加は不要。理由は以下のとおり。

| パス | 変化の有無 | 判定 |
|------|-----------|------|
| `/blog/[slug]/` | 初期コミット（2023-12-29）から一貫して `/blog/[slug]` | **不要** |
| `/blog` | 初期から独立したブログ一覧として存在 | **不要** |
| `/about` | 初期から存在、内容強化のみ | **不要** |
| `/works` | 新規追加（旧 URL なし） | **不要** |
| `/rss.xml` | URL 変化なし | **不要** |
| `/` | 初期（Astro デフォルト）→ ポートフォリオ優先型に段階強化。ページ自体は継続存在 | **不要** |

`/contact` は独立したページとして存在せず、`/`（トップページ）の Contact セクションに統合されている。過去に `/contact` が存在したことはないため、リダイレクト対象外。

### 根拠

- 初期コミット（`7f42e8c`、2023-12-29）時点で `/blog` と `/blog/[...slug].astro` は既に存在
- ルート (`/`) はAstro ブログスターターのデフォルトホームページとして始まり、ポートフォリオ強化（Issue #16、#22 他）により改修されてきたが、URL 自体は変わっていない
- ブログ記事の URL パターン（`/blog/[slug]/`）も変更なし

## 旧トップ導線の主要な被リンク候補

外部サービスからの流入が想定されるパスと、確認すべき箇所を以下に列挙する。

| 候補 | パス | 備考 |
|------|------|------|
| はてなブックマーク | `/blog/[記事スラグ]/` | 記事個別 URL は変化なし。旧 URL に流入があれば引き続き 200 |
| Twitter/X プロフィール | `keroway.com/` | プロフィール URL はトップに向けられることが多い。ポートフォリオ化により内容は変わったが URL は継続 |
| GitHub プロフィール | `keroway.com/` | 同上 |
| Qiita / Zenn クロスポスト | `/blog/[スラグ]/` | 記事個別 URL は変化なし |
| Google 検索インデックス | `/blog/[スラグ]/` および `/blog/` | 変化なし |

**調査推奨**: 実際の被リンク状況は Google Search Console の「リンク」レポートまたは [ahrefs](https://ahrefs.com) / [Moz Link Explorer](https://moz.com/link-explorer) 等のツールで確認すること。

## Search Console での URL 変更通知手順

将来、URL 変更が発生した場合の手順を記録する。

### 前提

Google Search Console には `keroway.com` プロパティを登録すること（未登録の場合は先に登録）。

### 手順（URL 変更時）

1. **`vercel.json` に 301 リダイレクトを追加する**

   ```json
   {
     "redirects": [
       {
         "source": "/old-path/:slug*",
         "destination": "/new-path/:slug*",
         "permanent": true
       }
     ]
   }
   ```

   `"permanent": true` で HTTP 301 になる。Vercel の `rewrites` と競合しないよう注意（rewrites より redirects が先に評価される）。

2. **Vercel 本番デプロイを確認する**

   デプロイ後、`curl -I https://keroway.com/old-path/` でレスポンスが `301 Moved Permanently` かつ `Location: /new-path/` になっていることを確認。

3. **旧 URL の再クロールをリクエストする**

   Search Console の「URL 検査ツール」で旧 URL を入力し「インデックス登録をリクエスト」をクリック。

4. **サイトマップを再送信する**

   Search Console の「サイトマップ」で `https://keroway.com/sitemap-index.xml` を再送信。

5. **301 リダイレクトの伝播確認**

   1〜2 週間後に Search Console の「カバレッジ」で旧 URL が「リダイレクト済み」カテゴリに移行しているか確認。

### 注意事項

- 日本語スラグ（パーセントエンコード）を含む URL をリダイレクトする場合、`source` と `destination` の両方でエンコード済みの文字列を使用する（例: `%E8%A8%98%E4%BA%8B` のまま記載）
- `rewrites` と `redirects` を同一パスに設定すると `redirects` が優先されるため意図しない挙動に注意
- 大量の URL を一括移動する場合は [Search Console のアドレス変更ツール](https://search.google.com/search-console/settings) も活用する

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-05-12 | 初版作成（Issue #68 対応） |
