# keroway 技術メモ

このリポジトリは「Qiita や Zenn に投稿するまででもないちょっとした内容」をメモしていく個人ブログです。Astro のブログテンプレートをベースに、カード型のブログ一覧や日本語スラッグに対応した導線を追加しています。

## 主な特徴

- 日本語を含む記事スラッグを自動 URL エンコードして、Vercel などのホスティングでも安全に配信
- 16:9 のサムネイル比率で統一したレスポンシブなカードグリッド表示とホバーインタラクション
- Astro Content Collections による Markdown/MDX 記事管理と型チェック
- RSS フィードとサイトマップを自動生成
- `SiteLayout` レイアウトでページ共通のメタデータ・ナビゲーションを一元管理し、アクセシビリティと reduced motion を考慮した UI
- すべてのスタイルはカスタマイズ可能な軽量 CSS で構成

## 技術スタック

- [Astro 5](https://astro.build/) + TypeScript
- [@astrojs/mdx](https://docs.astro.build/en/guides/integrations-guide/mdx/) による MDX サポート
- pnpm 9（`package.json` の `packageManager` 参照）
- デプロイ: [Vercel](https://vercel.com/)（プレビュー環境での動作を想定）

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
│   │   └── config.ts     # frontmatter スキーマ（title, description, pubDate, category など）
│   ├── layouts/          # ページレイアウト（SiteLayout, BlogPost など）
│   └── pages/            # ルーティングエントリ（一覧・個別ページなど）
├── astro.config.mjs      # Astro 設定（MDX・sitemap を統合）
├── pnpm-lock.yaml        # 依存関係ロック
└── tsconfig.json
```

- 記事は `src/content/blog/` に配置し、frontmatter で `title`, `pubDate`, `description`, `category`（任意）, `heroImage` などを指定します。
- 一覧ページはカード UI へ刷新済みで、frontmatter の `heroImage` と `category` を活用します。画像のアスペクト比は CSS の `aspect-ratio` で固定されます。
- 各ページは `SiteLayout` を経由して `<Head>` メタ情報とヘッダー／フッターを共有し、OGP `og:locale` を自動付与します。
- 新しいコンテンツを追加した際は `pnpm run build` で型エラーを確認し、必要に応じて Vercel プレビューでクリック確認を行ってください。

## デプロイについて

- Vercel のプレビュー／本番環境を想定した設定です。Astro の静的生成結果（`dist/`）を自動デプロイします。
- 日本語スラッグを含む URL は `encodeURIComponent` 済みのパスを使用しているため、ミドルウェアの失敗なく動作します。

## テンプレートについて

このサイトは [Astro Starter Kit: Blog](https://github.com/withastro/astro/tree/latest/examples/blog) をベースに構築しています。テンプレート元の README やドキュメントも参照しつつ、独自のスタイルと運用フローを追加しています。

テーマのスタイリングは [Bear Blog](https://github.com/HermanMartinus/bearblog/) を参考にしています。
