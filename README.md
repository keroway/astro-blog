# keroway 技術メモ

このリポジトリは「Qiita や Zenn に投稿するまででもないちょっとした内容」をメモしていく個人ブログです。Astro のブログテンプレートをベースに、カード型のブログ一覧や日本語スラッグに対応した導線を追加しています。

## 主な特徴

- 日本語を含む記事スラッグを自動 URL エンコードして、Vercel などのホスティングでも安全に配信
- 16:9 のサムネイル比率で統一したレスポンシブなカードグリッド表示とホバーインタラクション
- Astro Content Collections による Markdown/MDX 記事管理と型チェック
- RSS フィードとサイトマップを自動生成
- `SiteLayout` レイアウトでページ共通のメタデータ・ナビゲーションを一元管理し、アクセシビリティと reduced motion を考慮した UI
- トップページにはヒーロー、最新記事、フォーカステーマ、連絡用コールアウトを配置し、動線と信頼感を向上
- すべてのスタイルはカスタマイズ可能な軽量 CSS で構成

## 技術スタック

- [Astro 6](https://astro.build/) + TypeScript（strict モード有効）
- [@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/) による MDX サポート
- [@astrojs/rss](https://docs.astro.build/en/guides/rss/) による RSS フィード自動生成
- [@astrojs/sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) による XML サイトマップ生成
- [astro:assets](https://docs.astro.build/en/guides/images/) による画像最適化（自動フォーマット変換・リサイズ）
- [View Transitions](https://docs.astro.build/en/guides/view-transitions/) によるページ遷移アニメーション
- pnpm 10.24.0（`package.json` の `packageManager` 参照）
- Playwright による E2E テスト
- デプロイ: [Vercel](https://vercel.com/)（静的サイト生成）

## セットアップ

```bash
pnpm install
pnpm run dev
```

- 開発サーバー: http://localhost:4321
- 本番ビルド: `pnpm run build`
- ビルドのローカル確認: `pnpm run preview`

> `pnpm install` では同梱の `.npmrc` を利用しており、npm レジストリへのアクセス制限がある環境では `COREPACK_NPM_REGISTRY` を適宜設定してください。

## ディレクトリ構成と運用

```
├── public/               # 静的アセット（画像・フォントなど）
├── src/
│   ├── components/       # Header や日付フォーマッタなどの再利用コンポーネント（aria 属性や rel=... を付与済み）
│   ├── content/
│   │   ├── blog/         # Markdown/MDX の記事本体
│   │   └── works/        # 制作物紹介の Markdown/MDX
│   ├── content.config.ts # Content Collections スキーマ（blog / works）
│   ├── layouts/          # ページレイアウト（SiteLayout, BlogPost など）
│   └── pages/            # ルーティングエントリ（一覧・個別ページなど）
├── astro.config.mjs      # Astro 設定（MDX・sitemap を統合）
├── pnpm-lock.yaml        # 依存関係ロック
└── tsconfig.json
```

- 記事は `src/content/blog/` に配置し、frontmatter で `title`, `pubDate`, `description`, `category`（任意）, `heroImage` などを指定します。
- 制作物紹介は `src/content/works/` に配置し、`title`, `description`, `status`（`active` / `archived` / `wip`）, `repoUrl`, `lpUrl`, `demoUrl`, `tags`, `createdAt`, `featured` などを frontmatter で管理します。
- 一覧ページはカード UI へ刷新済みで、frontmatter の `heroImage` と `category` を活用します。画像のアスペクト比は CSS の `aspect-ratio` で固定されます。
- トップページは `getCollection('blog')` で最新 3 件を自動取得して表示するため、新規記事を追加するとホームも自動で更新されます。
- 各ページは `SiteLayout` を経由して `<Head>` メタ情報とヘッダー／フッターを共有し、OGP `og:locale` を自動付与します。
- 新しいコンテンツを追加した際は `pnpm run build` で型エラーを確認し、必要に応じて Vercel プレビューでクリック確認を行ってください。

## works 運用メモ

- LP は機能訴求と導入導線を担い、本サイトの `works` エントリでは制作経緯・設計判断・学びを掘り下げる。
- `repoUrl` は実装の一次情報、`lpUrl` は外部ランディングページへの導線として使い分ける。

## デプロイについて

- Vercel のプレビュー／本番環境を想定した設定です。Astro の静的生成結果（`dist/`）を自動デプロイします。
- 日本語スラッグを含む URL は `encodeURIComponent` 済みのパスを使用しているため、ミドルウェアの失敗なく動作します。

## 依存関係の管理

### 自動更新

`.github/dependabot.yml` で Dependabot を設定しており、毎週月曜 09:00 (JST) に以下のチェックが走ります。

- `npm` エコシステム: minor/patch のバンドル PR (`@astrojs/*`, `astro`, `@playwright/*`, `typescript` をグループ化)
- `github-actions`: アクションのバージョン更新
- `astro` と `typescript` のメジャーアップデートは別途 issue で扱うため Dependabot からは除外

更新 PR には `dependencies` ラベルが自動付与されるため、PR 一覧でフィルタできます。

### 脆弱性監査

社内ミラー (`.npmrc` の `registry=https://registry.npmmirror.com/`) は `audit` エンドポイント非対応のため、監査時のみ公式レジストリへ向ける必要があります。

```bash
pnpm audit --registry=https://registry.npmjs.org/
```

#### 現在の監査ステータス

直近の監査では HIGH 以上の脆弱性は **0 件** です (2026-05-08 時点)。Astro が transitive 依存に持つ `rollup` `picomatch` `yaml` `postcss` は `package.json` の `pnpm.overrides` でパッチ済みバージョンへ強制解決しています。upstream で対応版がリリースされたら overrides を順次削除してください。

## テンプレートについて

このサイトは [Astro Starter Kit: Blog](https://github.com/withastro/astro/tree/latest/examples/blog) をベースに構築しています。テンプレート元の README やドキュメントも参照しつつ、独自のスタイルと運用フローを追加しています。

テーマのスタイリングは [Bear Blog](https://github.com/HermanMartinus/bearblog/) を参考にしています。
