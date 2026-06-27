# 0018 — コンテンツ画像を astro:assets パイプラインへ移行する

- **ステータス**: Proposed
- **決定日**: 2026-06-27
- **決定者**: @keroway
- **関連 Issue**: [#410 画像を astro:assets (Image/Picture) へ本格移行する（#396 フォローアップ）](https://github.com/keroway/astro-blog/issues/410)
- **関連 PR**: 後続の実装 PR で参照する
- **関連 ADR**: 0004（メディア管理）、0016（Sveltia CMS）、0017（Astro 7 アップグレード）

---

## コンテキスト

[#396](https://github.com/keroway/astro-blog/issues/396) / [#407](https://github.com/keroway/astro-blog/issues/407) で LCP / CLS 退行対策として、hero 画像の `loading="eager"` / `fetchpriority="high"`、カード先頭画像の priority、Works hero の `aspect-ratio` は調整済み。しかし、現在の `heroImage` は `public/images/...` または `public/` 直下ファイルへの文字列パスであり、Astro の画像最適化パイプラインを通らない。

そのため、主要画像で以下が効いていない。

- AVIF / WebP への自動フォーマット変換
- `srcset` / `sizes` によるレスポンシブ配信
- width / height 属性の自動付与
- `astro:assets` の型安全な画像参照

### 現状の定量調査（2026-06-27）

- content entries: 59 件（blog + works）
- `heroImage`: 59 / 59 件に存在
- heroImage パス内訳:
  - `/images/blog/...`: 45 件
  - `/images/works/...`: 7 件
  - `public/` ルート旧ファイル（`/blog-store.png`, `/9OnF3a4.jpg` など）: 7 件
  - 外部 URL: 0 件
- `public/images/` 配下ファイル: 52 件
- Works に SVG hero が 1 件（`/images/works/obsidian-clipper.svg`）。SVG はラスタ最適化対象外で、ベクターとして passthrough する。
- `src/assets/` は未作成。
- Sveltia CMS（ADR 0016）設定は現在 `media_folder: public/images` / `public_folder: /images`。各 image field も `/public/images/{blog,works}` を指している。

### 確定済みの制約

- Astro 7 へ更新済み（ADR 0017）。以後は Astro 7 / Vite 8 を前提に実装する。
- SSG + Vercel 配信を継続する（ADR 0003 / 0005）。常時稼働サーバや外部画像 SaaS を増やさない。
- CMS は Sveltia CMS（ADR 0016）。Decap 互換設定の `media_folder` / `public_folder` を変更できる。
- 画像はリポジトリ管理を継続する。ADR 0004 の「外部ストレージ不要」という根幹は維持するが、保存場所と参照方式は本 ADR で上書きする。
- private repo 由来の Works 画像は、移行後も公開可否レビューを維持する。

---

## 決定事項

**コンテンツ画像を `public/images/` から `src/assets/content/{blog,works}/` へ移し、`heroImage` を Astro Content Collections の `image()` ヘルパに移行する。** ラスタ画像は `<Picture>` を標準とし、AVIF / WebP / fallback 形式の `srcset` を生成する。SVG は変換せず、import 済み asset の URL を `<img>` で passthrough する。

*Rationale:* `astro:assets` は `src/` 配下のローカル画像を ESM 解決することで型安全・寸法推定・ビルド時最適化を提供する。Sveltia CMS は `media_folder` を `src/assets` 系へ向けられるため、CMS アップロード先と Astro の最適化パイプラインを一致させられる。外部ストレージを増やさず、既存の Git ベース運用と SSG 方針を維持できる。

### 画像配置と frontmatter パス

- 保存先:
  - blog: `src/assets/content/blog/`
  - works: `src/assets/content/works/`
- frontmatter の `heroImage` 値は **repo-root absolute な `/src/assets/content/...` 形式**に統一する。
  - 例: `heroImage: /src/assets/content/blog/3833e04ad749.jpg`
  - 理由: Sveltia の `public_folder` と同じ値を frontmatter に保存でき、`../../assets/...` のような content-relative パスより CMS 設定・人間のレビューが分かりやすい。
- `public/` ルート旧ファイルも、heroImage として使われている 7 件は同じく `src/assets/content/blog/` へ移す。
- `public/` に残すもの:
  - favicon / manifest / robots / admin など、URL 固定の静的アセット
  - `blog-placeholder-100.png` は、placeholder 用に継続使用する場合のみ `public/` 据え置き可。ただし heroImage として使う entries は移行対象とする。

### スキーマ

`src/content.config.ts` で `image()` ヘルパを使用する。

- blog: `heroImage: image().optional()`
- works: `heroImage: image().optional()`
- `ogImage` は今回の主対象外。既存の手動 OG 指定が必要なら段階的に `image()` 化するが、まず hero / card の配信最適化を優先する。

### レンダリング

- ラスタ画像（jpg / jpeg / png / webp など）:
  - hero / card とも `<Picture>` を標準採用。
  - `formats={["avif", "webp"]}` + fallback で配信。
  - `widths` / `sizes` はレイアウト別に指定する。
  - #407 の priority 方針を維持する。
    - 記事 hero / Works hero: `loading="eager"`, `fetchpriority="high"`
    - カード: above-the-fold または先頭カードのみ priority、その他は lazy
- SVG:
  - 変換しない。`src` URL を `<img>` で出す passthrough とする。
  - SVG はベクターであり AVIF / WebP 化の対象にしない。
- `transition:name` は BlogPost hero で維持する。

### OG / 構造化データ

- `BlogPost.astro` の `articleSchema.image` は絶対 URL が必要。
- `heroImage` が image metadata object になるため、`getImage()` または `<Picture>` 生成結果の `src` を使い、`Astro.site` と結合して絶対 URL を生成する。
- `SiteLayout` / `BaseHead` の `image` prop は string URL 前提のため、必要なら `heroImage` から事前に文字列 URL を導出して渡す。

### Sveltia CMS 設定

`public/admin/config.yml` の image field を `src/assets/content` 系へ更新する。

- blog hero / og / body media:
  - `media_folder: /src/assets/content/blog`
  - `public_folder: /src/assets/content/blog`
- works hero / body media:
  - `media_folder: /src/assets/content/works`
  - `public_folder: /src/assets/content/works`

Sveltia の `media_folder` はリポジトリ内保存先、`public_folder` は frontmatter に書かれる値である。Astro `image()` が `/src/assets/...` を解決できるため、この形式で CMS と Astro を一致させる。

### 実施手順

1. `src/assets/content/{blog,works}/` を作成。
2. `public/images/{blog,works}` と heroImage 参照中の `public/` ルート旧ファイル 7 件を移動。
3. frontmatter の `heroImage` 59 件を `/src/assets/content/...` へ書き換え。
4. `src/content.config.ts` に `image()` ヘルパを導入し、blog / works の `heroImage` を `image().optional()` に変更。
5. BlogPost / WorkEntryLayout / RecentNoteCard / WorksCard を `<Picture>` ベースへ変更。SVG は passthrough helper で分岐。
6. Sveltia `config.yml` の media folders を更新。
7. `pnpm run build` / Playwright / Lighthouse で検証。
8. 本 ADR を Accepted へ昇格し、実装 PR を追記。

### 検証ゲート

- `pnpm run build` が green。
- Playwright E2E が green。
- Lighthouse CI が現状以上（特に LCP / CLS の退行なし）。
- 主要画像（記事 hero / Works hero / カード）のラスタ画像が AVIF / WebP + `srcset` で配信される。
- width / height が出力され、CLS が発生しない。
- `articleSchema.image` / og:image が絶対 URL として有効。
- Sveltia CMS の image widget が `/src/assets/content/{blog,works}` へ保存し、frontmatter が `image()` で解決できる。

---

## 却下した候補

### 候補 A — `public/images/` のまま `<Image>` / `<Picture>` に渡す

**却下理由:** `public/` 配下の文字列 URL は Astro の ESM asset graph に入らず、寸法推定・フォーマット変換・`srcset` 生成の対象にならない。現状の限界を解決できない。

### 候補 B — content entry と画像を entry-relative に同梱する

**却下理由:** Sveltia は entry-relative media をサポートするが、本リポジトリの content entries は `src/content/{blog,works}` 直下にフラット配置されている。entry bundle 化すると slug / path / CMS 設定 / 既存スクリプトへの影響が大きく、#410 の目的に対して過剰。

### 候補 C — Cloudinary / ImageKit / Vercel Blob / Cloudflare R2 へ外部化する

**却下理由:** 現在の画像規模は 52 ファイルで、外部ストレージ導入の運用コスト・課金・ロックインが釣り合わない。ADR 0004 の「外部ストレージ不要」は維持する。

### 候補 D — Vercel Image Optimization を主軸にする

**却下理由:** 本サイトは SSG であり、ビルド時最適化で十分。オンデマンド変換を主軸にするとプラットフォーム依存が増え、Phase 3 のホスティング移行余地が狭まる。

---

## Revisit When

- `src/assets/content/` 配下の画像が 100 MB を超え、Git clone / CI build の遅延が顕著になったとき。
- Sveltia の `media_folder: /src/assets/...` 運用で preview / upload / delete に重大な不整合が出たとき。
- 画像数増加で Astro build の画像最適化時間が CI 予算を圧迫したとき。
- SVG / アニメーション GIF / 外部画像など、ラスタ最適化に乗らない画像が主要コンテンツの大半を占めるようになったとき。
- SSR / hybrid rendering へ方針変更し、on-demand image optimization の便益がビルド時最適化を上回ったとき。
