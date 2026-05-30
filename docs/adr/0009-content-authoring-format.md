# 0009 — Keystatic 本文 content フィールドの format: Markdoc (.mdoc) を採用

- **ステータス**: Accepted
- **決定日**: 2026-05-30
- **決定者**: @keroway
- **関連 Issue**: [#213 Keystatic に本文 content フィールドを追加し本文編集を可能にする](https://github.com/keroway/astro-blog/issues/213)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)（本文編集 UI は必須要件）, [0005 — Keystatic admin ランタイム](./0005-keystatic-admin-runtime.md)
- **後続 Issue**: 既存 blog `.md` 約52件の `.mdoc` 一括移行は本 ADR / PR では行わず follow-up issue に分離する（「スコープ」参照）。

---

## コンテキスト

ADR 0002 は「Markdown / MDX を WYSIWYG に近い UI で編集できること」を Keystatic 採用の必須要件に挙げている。しかし現状の `keystatic.config.ts` は frontmatter のみを管理し、本文 (Markdown body) を編集する **content フィールド** (`fields.markdoc` / `fields.mdx`) を持たない。Keystatic 上で公開日・タグは編集できても、本文そのものは編集できない状態だった。

Keystatic の content フィールドは format によって**書き出すファイル拡張子が変わる**:

| format | フィールド | 書き出し拡張子 | Astro 側の描画手段 |
|--------|-----------|--------------|------------------|
| Markdoc | `fields.markdoc` | `.mdoc` | `@astrojs/markdoc` 統合 |
| MDX | `fields.mdx` | `.mdx` | `@astrojs/mdx`（導入済み） |

現状の記事はすべて `.md`（loader pattern `**/*.{md,mdx}`）で、content フィールドを追加すると本文を持つ記事の拡張子が `.md` から変わる。この非自明さが、これまで frontmatter-only に留まっていた理由である。どちらの format を採るかを決める必要がある。

## 決定事項

**Markdoc (`.mdoc`) を採用する。** `keystatic.config.ts` の blog / works 両 collection に `format: { contentField: "content" }` と `content: fields.markdoc(...)` を追加する。

付随する構成:

- `@astrojs/markdoc` + `@markdoc/markdoc` を devDependencies に追加し、`astro.config.mjs` の `baseIntegrations` に `markdoc()` を加える（Preview でも有効。書き込みを伴わないため。mount を絞るのは `keystatic()` 統合のみ）。
- `markdoc.config.mjs` を新設し、`@astrojs/markdoc/shiki` extension で dual theme (`github-light` / `github-dark`) を**再宣言**する。Markdoc 本文は `astro.config.mjs` の `markdown.shikiConfig` を参照しないため。
- `src/content.config.ts` の glob を `**/*.{md,mdx,mdoc}` に拡張し、`.md` / `.mdoc` 混在を許容する。Zod schema は frontmatter 対象なので変更不要。

## 採用理由（Why Markdoc）

1. **既存 `.md` 本文の round-trip 安全性 — Markdoc 優位。** 既存記事を調査したところ、`src/content/blog/BeautifulSoup4(2).md` に `<pre>{}</pre>`（生 HTML + 空 `{}`）が実在し、ほかにも `{` / `}` を含むファイルが複数ある。MDX はこれらを JSX 要素・式として解釈するため、ビルド失敗または本文欠落を起こす。Markdoc は `{% %}` タグのみが特殊で、`<` と `{` を通常テキストとして安全に往復できる。受け入れ条件「本文欠落・崩れなく round-trip」を満たすには Markdoc が適切。
2. **Keystatic 公式 Astro 推奨。** Keystatic の Astro テンプレートは `fields.markdoc` + `.mdoc` を採用しており、WYSIWYG エディタの往復が安定している。
3. **見出し ID 対応。** `@astrojs/markdoc` は heading IDs を内蔵し、`render()` → `<Content />` で `headings` を返す。blog 描画（目次）に必要な情報を将来も得られる。

## 却下した選択肢: MDX (.mdx)

- 既存 `@astrojs/mdx` を再利用でき追加依存ゼロという利点はあるが、上記 1 の round-trip リスクが致命的。`.md` → `.mdx` 一括移行は `<` / `{` の個別エスケープを要し、52件規模で破壊リスクが高い。

## スコープと影響範囲

- **本 PR の範囲**: content フィールド追加 + markdoc 統合導入 + shiki 再設定 + 代表1件（`src/content/works/obsidian-clipper.md` → `.mdoc`）の round-trip 実証まで。
- **本 PR の範囲外**: 既存 blog `.md` 約52件の `.mdoc` 一括移行。変換スクリプト + 全文 diff レビューが必要で関心事が肥大化するため follow-up issue に分離する。glob が混在を許容するので、未移行 `.md` は従来どおり描画され続ける。
- **URL への影響なし**: ルートは `post.id`（ファイル名から拡張子を除いたもの）で決まるため、`.md` → `.mdoc` でスラグ・URL は不変（例: `/works/obsidian-clipper`）。
- **shiki の二重管理**: `.md` 側は `astro.config.mjs` の `markdown.shikiConfig`、`.mdoc` 側は `markdoc.config.mjs` の shiki extension で別々に設定する。テーマを github-light / github-dark で一致させ、コードブロックの色が乖離しないようにする。

## 結果

- Keystatic admin UI から本文を編集・保存できるようになる（ADR 0002 の必須要件を達成）。
- 既存 `.md` 記事は無変更で描画され続け、段階的に `.mdoc` へ移行できる。
- format 選択の根拠と影響範囲を本 ADR に記録し、受け入れ条件「ADR か PR 説明に明記」を満たす。
