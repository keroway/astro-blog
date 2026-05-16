# OGP 画像生成ライブラリ評価レポート

- **作成日**: 2026-05-17
- **対象 Issue**: [#82 satori / @vercel/og の比較と採用ライブラリを決定する](https://github.com/keroway/astro-blog/issues/82)
- **親 Issue**: [#25 OGP 画像の動的生成（satori / @vercel/og）](https://github.com/keroway/astro-blog/issues/25)
- **後続**: [#83 /og/[slug].png エンドポイントを実装する](https://github.com/keroway/astro-blog/issues/83), [#84 BaseHead に動的 OG URL を設定する](https://github.com/keroway/astro-blog/issues/84)
- **前提**: [ADR 0003 レンダリング戦略](./adr/0003-rendering-strategy.md)（SSG 継続）

---

## 1. 背景

`heroImage` を持たない記事も多く、SNS シェア時の見栄えがバラつく。ブログ記事ごとにタイトル・カテゴリ・タグから OGP 画像を生成し、シェア時の表示を統一したい。

ADR 0003 で **SSG 継続** が決定したため、生成方式の選択肢は次の 2 つに絞られる:

- **ビルド時生成（SSG）**: `getStaticPaths()` で全記事の PNG を事前生成して `dist/og/` に出力
- **オンデマンド生成（SSR / Edge）**: Vercel Functions でリクエスト時に PNG を返す → adapter 導入が必要

ADR 0003 の決定（adapter 不導入）と整合する選択肢は **ビルド時生成のみ** だが、ライブラリ選定としては両者の特性を比較する。

---

## 2. 要件

| 要件 | 内容 |
|------|------|
| **日本語フォント対応** | Zen Maru Gothic を埋め込み、CJK 文字（漢字・ひらがな・カタカナ）が正しくレンダリングされること |
| **ビルド時生成** | SSG モードで動作し、`@astrojs/vercel` adapter を要求しないこと |
| **出力形式** | PNG（OGP 標準）。SVG 単独では Twitter Card が表示しないため NG |
| **画像サイズ** | 1200 × 630（OGP 推奨） |
| **Astro 6 親和性** | Astro 6 の static endpoint (`src/pages/og/[slug].png.ts`) で動作可能なこと |
| **Vercel コスト** | Functions invocation を発生させないこと（ビルド時生成なら無料） |
| **依存追加コスト** | Node 22 系の native modules（resvg-js 等）が Vercel ビルド環境で動作すること |

---

## 3. 候補ライブラリ

### 3.1 `satori`（[@vercel/satori](https://github.com/vercel/satori)）

- **役割**: JSX + CSS → SVG 変換ライブラリ（Vercel 製、`@vercel/og` の中核ライブラリ）
- **ランタイム**: Node.js / Edge / ブラウザのいずれでも動作
- **出力**: SVG 文字列
- **PNG 変換**: 別途 `@resvg/resvg-js`（Rust 製、Node native）または `sharp` で SVG → PNG ラスタライズが必要
- **日本語フォント**: `fonts: [{ name, data: ArrayBuffer, weight, style, lang: 'ja-JP' }]` 形式で渡す。`lang` 指定で CJK の locale-aware レンダリングが効く
- **動的フォント読み込み**: `loadAdditionalAsset(languageCode, segment)` で言語別フォントの遅延ロードが可能（CDN fetch 等）

#### Astro 統合事例

ctx7 で確認した範囲で次の 3 つが既存:

| プロジェクト | 概要 |
|-------------|------|
| [`astro-satori`](https://github.com/cijiugechu/astro-satori) | Astro 用 satori ラッパー |
| [`astro-opengraph-images`](https://github.com/shepherdjerred/astro-opengraph-images) | JSX / Tailwind 構文で OG 画像生成 |
| [`astro-takumi`](https://github.com/vikas5914/astro-takumi) | Content Collections 対応の OG 画像ジェネレータ |

→ Astro エコシステムでは **satori 採用がデファクト**。

### 3.2 `@vercel/og`

- **役割**: `ImageResponse` クラス。内部で satori + resvg を使い PNG を HTTP Response として返す
- **ランタイム**: Vercel **Edge Runtime 想定**。Next.js の `next/og` が主用途
- **出力**: PNG（Response オブジェクト）
- **日本語フォント**: satori と同じ `fonts` オプション
- **Astro での利用**: `@astrojs/vercel` adapter（Edge Runtime）+ `src/pages/api/og.ts` パターンで動作するが、ビルド時生成の用途では使えない（API ルートとして実行される設計のため）

---

## 4. 比較表

| 評価軸 | satori (+ @resvg/resvg-js) | @vercel/og |
|--------|---------------------------|-----------|
| **ビルド方式** | ✅ ビルド時 PNG 生成可（static endpoint で `dist/og/*.png` を出力） | ❌ Edge Function ランタイム前提（ビルド時生成は想定外） |
| **SSG 互換性** | ✅ adapter 不要 | ❌ `@astrojs/vercel` adapter（Edge）が必要 |
| **日本語フォント** | ✅ `fonts.data` に Zen Maru Gothic woff2 サブセットを渡せる。`lang: 'ja-JP'` 対応 | ✅ 同上（中身は satori） |
| **PNG 出力** | △ `@resvg/resvg-js` を追加で導入する必要あり | ✅ `ImageResponse` がそのまま PNG を返す |
| **Vercel コスト** | ✅ ビルド時のみ実行、Functions invocation ゼロ | ❌ リクエストごとに Edge Function invocation（無料枠は超えにくいが累積する） |
| **Cold start** | なし（静的配信） | あり（Edge Runtime 起動） |
| **Astro 6 親和性** | ✅ static endpoint パターン (`*.png.ts`) で素直に書ける。既存統合あり | △ Astro 公式統合なし、コミュニティ事例も少ない |
| **依存追加** | `satori`, `@resvg/resvg-js`（+ フォント woff2） | `@vercel/og`, `@astrojs/vercel` |
| **ADR 0003 との整合** | ✅ SSG 継続方針と完全に整合 | ❌ adapter 導入が必須で ADR 0003 と矛盾 |
| **既存 CDN キャッシュ** | ✅ Vercel が自動で静的アセットとして配信（Cache-Control 不要） | △ Edge レスポンスのキャッシュ設定が別途必要 |

---

## 5. 採用案: **satori + @resvg/resvg-js**

ビルド時に Astro の static endpoint で SVG を生成し、`@resvg/resvg-js` で PNG にラスタライズする方式を採用する。

### 採用理由

1. **ADR 0003（SSG 継続）と完全に整合**
   - `@astrojs/vercel` adapter を導入せずに済む
   - レンダリング戦略の前提を変えずに OGP 動的生成を実現できる

2. **Vercel Functions のコストを発生させない**
   - ビルド時生成なら invocation ゼロ
   - 個人ブログ規模で課金リスクを完全に排除できる

3. **Astro 6 の static endpoint パターンと素直に噛み合う**
   - `src/pages/og/[slug].png.ts` で `getStaticPaths()` + `GET()` を書くだけで `dist/og/*.png` が生成される
   - Astro 6 公式の `import.meta.glob` や Content Collections と組み合わせ可能

4. **Zen Maru Gothic サブセット埋め込みが素直**
   - `fonts: [{ name: 'Zen Maru Gothic', data: woff2ArrayBuffer, weight: 400, lang: 'ja-JP' }]`
   - サブセット化は `pyftsubset` または `fonttools` でビルド前に実施（#83 のスコープ）

5. **配信は CDN 静的アセット**
   - Cold start なし、Vercel の Static CDN によりレイテンシ最小

### 却下理由（@vercel/og）

1. **SSG 構成と矛盾**: Edge Function ランタイムが前提で、`@astrojs/vercel` adapter（Edge）の導入が必要。ADR 0003 で却下した方針に逆戻りする
2. **Functions コストが発生**: リクエストごとに invocation が積み上がる。ビルド時生成と比較してメリットがない
3. **Astro 公式統合がない**: Next.js の `next/og` が主用途で、Astro でのコミュニティ事例も限定的
4. **PNG 出力が `ImageResponse` 経由限定**: ビルド時に「生の PNG バイト列」として取り出す API がなく、SSG 経路に組み込みづらい

---

## 6. 後続アクション

| Issue | 内容 |
|-------|------|
| [#83](https://github.com/keroway/astro-blog/issues/83) | `src/pages/og/[slug].png.ts` の実装。`satori` + `@resvg/resvg-js` で SVG → PNG 変換。Zen Maru Gothic の woff2 サブセットを `public/fonts/` 配下に配置し、ビルド時に読み込む |
| [#84](https://github.com/keroway/astro-blog/issues/84) | `src/components/BaseHead.astro` で `og:image` / `twitter:image` を `${Astro.url.origin}/og/${slug}.png` に設定。フォールバック画像（`public/og-default.png`）を整備。RSS フィードへの反映も確認 |

### ADR 起票の方針

本評価レポートは ADR 起票の前段として位置付ける。#83 / #84 の実装完了後、運用上の知見（ビルド時間影響・フォントサブセット運用・OGP 検証手順）を踏まえて **`docs/adr/0005-ogp-image-generation.md` を別 Issue で起票** する想定（ADR 連番は `docs/adr/README.md` で確定）。

### satori 補助ライブラリの選定メモ

- **`@resvg/resvg-js`** を採用候補とする
  - Rust 実装（Node native binding）で SVG → PNG が高速
  - Vercel ビルド環境（Linux x64）で動作実績あり
  - `sharp` でも代替可能だが、本プロジェクトでは `astro:assets` が内部利用しているため依存重複を避けたい
  - `astro:assets` の `sharp` 経由で SVG → PNG する案は #83 で再検証
- **フォントサブセット**: 既存記事 52 件に出現する漢字一覧を `scripts/audit-blog.ts` 系で抽出 → `pyftsubset` でサブセット woff2 を生成する運用を #83 で確定

---

## 参考資料

- [Satori 公式ドキュメント](https://github.com/vercel/satori) — JSX → SVG 変換 API
- [Next.js `next/og` ドキュメント](https://nextjs.org/docs/app/api-reference/functions/image-response) — `ImageResponse` の API リファレンス（Astro での参考実装）
- [astro-satori](https://github.com/cijiugechu/astro-satori), [astro-opengraph-images](https://github.com/shepherdjerred/astro-opengraph-images), [astro-takumi](https://github.com/vikas5914/astro-takumi) — Astro での satori 統合事例
- [ADR 0003 レンダリング戦略](./adr/0003-rendering-strategy.md) — SSG 継続の決定根拠
