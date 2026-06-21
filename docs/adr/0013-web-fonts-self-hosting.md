# ADR 0013: Web フォントを Astro Fonts API + Fontsource で自己ホスト化する

## ステータス

採用 (2026-06-17)

## コンテキスト

`src/components/BaseHead.astro` は Shippori Mincho・BIZ UDPGothic・JetBrains Mono の 3 ファミリーを Google Fonts から読み込んでいた。

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&..." rel="stylesheet" />
```

この構成には次の問題がある:

1. **外部オリジン依存** — ネットワーク障害・Google の仕様変更・プライバシー規制で影響を受ける
2. **レンダリングブロック** — Google Fonts の CSS が `<link rel="stylesheet">` で blocking resource になる
3. **Lighthouse 指摘** — Fonts API 追加後の Lighthouse CI で "Eliminate render-blocking resources" が検出された

## 検討した選択肢

| 案 | 概要 | 評点 |
|----|------|------|
| **A. Astro Fonts API + Fontsource** | `astro.config.mjs` の `fonts[]` に Fontsource provider を設定。ビルド時にフォントを取得して自己ホスト | ✅ 採用 |
| B. @fontsource 直接インポート | `pnpm add @fontsource/shippori-mincho` 等してコンポーネントで CSS を import | 動作するが Astro の最適化 (preload 自動生成、フォールバック生成) が得られない |
| C. Google Fonts 継続 | 現状維持 | 上記問題が残る |

## 決定事項

**Astro 6 Fonts API (`fonts` トップレベルオプション) と `fontProviders.fontsource()` を使用する。**

根拠:

- **Fontsource 対応確認**: `@fontsource/shippori-mincho`・`@fontsource/biz-udpgothic`・`@fontsource/jetbrains-mono` はいずれも `japanese` サブセット (unicode-range 分割) を持ち、npm で公開済み
- **Astro 6 安定 API**: `fontProviders` は experimental フラグ不要で Astro 6.4 以降 stable
- **自動最適化**: `<Font cssVariable="--font-*" preload />` が `preload` リンクと `@font-face` CSS を生成し、手書きより安全
- **前例**: OG 画像生成で `@fontsource/zen-maru-gothic` を既に使用 (ADR なし、実績あり)

## 実装

`astro.config.mjs` に 3 フォントを定義し、`BaseHead.astro` の Google Fonts 行を `<Font />` コンポーネントで置き換える。`src/styles/tokens.css` の `--kw-font-*` 変数の先頭に Astro が生成する CSS 変数 (`var(--font-*)`) を差し込む。

## 既知の限界

`@keystatic/core` (v0.5.50 時点) はパッケージ内部の管理 UI に Inter を Google Fonts から読み込む `<link>` をハードコードしている。このコードはビルド成果物の `_astro/keystatic-page.*.js` に含まれ、`/keystatic` 管理画面アクセス時に Google Fonts リクエストが発生する。

この参照は `keystatic.config.ts` 等のプロジェクト設定では制御できない。サイト訪問者（ブログ読者）が閲覧するコンテンツページ（`/`・`/blog/`・`/about`・`/works/` 等）での Google Fonts リクエストはゼロであり、本 ADR の主旨（コンテンツページの配信最適化）は達成している。

Keystatic の Google Fonts 参照を解消する手段は [ADR 0014](./0014-keystatic-google-fonts-removal.md) で `pnpm patch` による除去と確定した。

## Revisit When

- Astro が Fonts API を breaking change で改訂したとき
- `@fontsource` のパッケージが非推奨・更新停止になったとき
- 日本語フォントファイルサイズが Vercel のビルド上限に近づいたとき
- `@keystatic/core` が Google Fonts 依存を廃止したとき
