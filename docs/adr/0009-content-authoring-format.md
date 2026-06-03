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

**本文 content フィールドの format には Markdoc (`.mdoc`) を採用する。** ただし collection 単位で段階導入し、**まず `works` collection に適用**する。`blog` collection への適用は後述の理由で follow-up（[#218](https://github.com/keroway/astro-blog/issues/218)）に分離する。

### 前提となる Keystatic の挙動（重要）

Keystatic は **collection 単位で1つの format（＝ファイル拡張子）**を持つ。`path` が `.../*`（単一ファイル）の collection では:

- **content フィールドなし** → format は既定で **YAML**（`.yaml` を読み書き）。**`.md` ファイルは一覧されない。**
- **`fields.markdoc` の content フィールドあり** → format は **Markdoc**（`.mdoc`）。`.mdoc` のみ一覧される。

このため、本リポの既存記事（blog 52件・works 2件はすべて `.md`）は **#213 以前から Keystatic admin UI に一覧されていなかった**（frontmatter-only = YAML 既定のため）。`.md` を Keystatic で編集可能にするには、その collection の**全エントリを Keystatic が期待する拡張子に変換する**必要がある。content フィールドを足すだけで既存 `.md` を変換しないと、その collection は admin 上で空のままになる（編集対象が増えない）。

### 適用内容（works）

- `keystatic.config.ts` の `works` collection に `format: { contentField: "content" }` + `content: fields.markdoc(...)` を追加し、**works の全2件（`obsidian-clipper` / `timeline-dsl`）を `.mdoc` に変換**する。これにより works は admin UI で本文＋frontmatter を編集できるようになる（初めて編集対象になる）。
- `@astrojs/markdoc` + `@markdoc/markdoc` を devDependencies に追加し、`astro.config.mjs` の `baseIntegrations` に `markdoc()` を加える（Preview でも有効。書き込みを伴わないため。mount を絞るのは `keystatic()` 統合のみ）。
- `markdoc.config.mjs` を新設し、`@astrojs/markdoc/shiki` extension で dual theme (`github-light` / `github-dark`) を**再宣言**する。Markdoc 本文は `astro.config.mjs` の `markdown.shikiConfig` を参照しないため。
- `src/content.config.ts` の `works` loader glob を `**/*.{md,mdx,mdoc}` に拡張する（`blog` は `.mdoc` を持たないので `{md,mdx}` のまま）。Zod schema は frontmatter 対象なので変更不要。

## 採用理由（Why Markdoc）

1. **既存 `.md` 本文の round-trip 安全性 — Markdoc 優位。** 既存記事を調査したところ、`src/content/blog/BeautifulSoup4(2).md` に `<pre>{}</pre>`（生 HTML + 空 `{}`）が実在し、ほかにも `{` / `}` を含むファイルが複数ある。MDX はこれらを JSX 要素・式として解釈するため、ビルド失敗または本文欠落を起こす。Markdoc は `{% %}` タグのみが特殊で、`<` と `{` を通常テキストとして安全に往復できる。受け入れ条件「本文欠落・崩れなく round-trip」を満たすには Markdoc が適切。
2. **Keystatic 公式 Astro 推奨。** Keystatic の Astro テンプレートは `fields.markdoc` + `.mdoc` を採用しており、WYSIWYG エディタの往復が安定している。
3. **見出し ID 対応。** `@astrojs/markdoc` は heading IDs を内蔵し、`render()` → `<Content />` で `headings` を返す。blog 描画（目次）に必要な情報を将来も得られる。

## 却下した選択肢: MDX (.mdx)

- 既存 `@astrojs/mdx` を再利用でき追加依存ゼロという利点はあるが、上記 1 の round-trip リスクが致命的。`.md` → `.mdx` 一括移行は `<` / `{` の個別エスケープを要し、52件規模で破壊リスクが高い。

## なぜ blog を分離するか（#218）

- blog は `.md` 52件で、うち **生 HTML を含む5件・`{` を含む9件** がある。Markdoc は生 HTML の扱いが Astro 既定の markdown と異なる（既定で素の HTML をそのまま通さない）ため、`.md` → `.mdoc` 変換は記事ごとに描画差分を確認する必要がある。
- 全 collection を一度に変換すると差分が大きく、`1 PR = 1 関心事` の原則に反する。blog は変換スクリプト + 全文 diff レビューを伴う独立タスクとして #218 で扱う。
- works は2件のみで、両者とも `{% %}` / `<` / `{` を含まずクリーンに変換でき、本 PR で round-trip を実証できる。

## 影響範囲

- **works（本 PR）**: 2件を `.mdoc` 化。admin UI で本文編集が可能になる。`/works/obsidian-clipper`・`/works/timeline-dsl` の URL は不変（ルートは拡張子を除いた `id` で決まる）。
- **blog（変更なし）**: frontmatter-only のまま。#213 以前と同じく Keystatic では一覧されないが、Astro 側の描画は従来どおり。本文編集の有効化は #218 の blog 一括移行で実現する。
- **shiki の管理**: `works` 移行後（本 ADR）は `.mdoc` / `.md` が並存し、`.md` 側は `astro.config.mjs` の `markdown.shikiConfig`、`.mdoc` 側は `markdoc.config.mjs` の shiki extension で別々に設定していた。`blog` の `.mdoc` 一括移行（#218 完了）後は `.md` / `.mdx` がゼロになり、`markdown.shikiConfig` はデッドコードとなった。そのため #239 で `astro.config.mjs` の `markdown.shikiConfig` ブロックを削除し、shiki 設定は `markdoc.config.mjs` 側に一本化された。

## 結果

- works の本文を Keystatic admin UI から編集・保存できるようになる（ADR 0002 の必須要件を works で達成）。
- Markdoc 統合・shiki 再設定・format 判断という共通基盤を本 PR で確立し、blog 移行（#218）は記事変換に集中できる。
- format 選択の根拠・Keystatic の format 挙動・影響範囲を本 ADR に記録し、受け入れ条件「ADR か PR 説明に明記」を満たす。
