# CMS UI 改善メモ

- **対象**: `/admin/` (Sveltia CMS)
- **関連 ADR**: [0016 — CMS を Keystatic から Sveltia CMS へ移行する](./adr/0016-cms-keystatic-to-sveltia.md)

## テーマ適用

管理画面のプロダクト感を keroway.com 本体に寄せるため、
Sveltia CMS の SPA に対して `public/admin/theme.css` を読み込む。

```html
<link rel="stylesheet" href="/admin/theme.css" />
```

この CSS は Sveltia CMS の内部実装に強く依存しすぎないよう、次の範囲に留める。

- CMS 専用のデザイントークン（色、角丸、影、フォーカス）
- `button` / `[role="button"]` / form controls の基礎スタイル
- `data-keroway-admin-action` など、`src/pages/admin.astro` 側で
  付与する安定したセマンティック hook
- Sveltia UI が公開している `--sui-*` トークン経由のテーマ調整
  （checkbox など内部 UI 部品）

## プレビューの寄せ方

記事エディタ右側のプレビューは `CMS.registerPreviewStyle("/admin/preview.css")`
で本番記事向けのタイポグラフィを注入する。
`public/admin/preview.css` は `/admin/theme.css` と同じく self-contained に保ち、
`src/styles` を直接 import しない。

寄せる対象:

- 本文フォント、見出し階層、行間、本文幅
- リンク色、code/pre、blockquote、table、img の角丸
- ライト / ダーク両テーマの配色

割り切る対象:

- Markdoc 独自タグや callout の完全再現
- 本番レイアウトのすべての補助 UI（共有ボタン、進捗表示など）

ゴールは「公開後の読み味を想像しやすいこと」であり、
DOM 構造まで本番と一致させることではない。

### Sveltia UI トークン運用

Sveltia CMS の checkbox はネイティブ `input[type="checkbox"]`
ではなく、`<button role="checkbox">` として実装されている。
そのため keroway 側の汎用 button ルールをそのまま当てると、
最小高 44px / 大きい角丸が波及して縦長ピル状に崩れる。

- 汎用ボタンスタイルは
  `button:not([role="checkbox"]):not([role="radio"]):not([role="switch"])`
  のように除外する
- checkbox / control の見た目は `public/admin/theme.css` で
  `--sui-checkbox-*` や `--sui-focus-ring-color` を上書きし、
  Sveltia UI の公開トークン経由で合わせる
- 追加のトークンを使う前に
  `grep -o -- '--sui-[a-z-]*' node_modules/@sveltia/cms/dist/sveltia-cms.mjs | sort -u`
  で実名を確認する

## ボタン種別

| 種別 | 用途 |
| --- | --- |
| `primary` | 推奨導線、保存、作成など最重要アクション |
| `secondary` | GitHub ログイン、プレビューなど主操作に準じるアクション |
| `subtle` | 補助操作、キャンセル、閉じる |
| `danger` | 削除、破棄など破壊的操作 |

## 主要アクションの棚卸し

Sveltia CMS 側の文言はバージョンにより変わる可能性があるため、`src/pages/admin.astro` では日本語/英語の代表語を正規表現で分類し、`data-keroway-admin-action` を付与する。

| 現状ラベル例 | 改善後/扱い | 種別 |
| --- | --- | --- |
| `Work with Local Repository` | `ローカルリポジトリで編集` | `primary` |
| `Save`, `保存`, `Create`, `作成`, `Submit` | 保存・作成系の最重要操作 | `primary` |
| `Sign In with GitHub` | `GitHub でサインイン` | `secondary` |
| `Preview`, `Publish`, `Upload`, `Media` | プレビュー・公開・メディア系の準主要操作 | `secondary` |
| `Sign In Using Access Token` | `アクセストークンでサインイン` | `subtle` |
| `Cancel`, `Close`, `Back`, `Edit` | キャンセル・戻る・補助編集 | `subtle` |
| `Delete`, `Discard`, `Remove`, `Reset` | 削除・破棄・リセット | `danger` |

## フィールド文言の方針

`public/admin/config.yml` のラベル・ヒントは、久しぶりに開いても判断できることを優先する。

- 日本語を主表記にする
- `OG` / `Canonical` などの略語は、必要に応じて「SNS シェア画像」「正規 URL」のように用途が分かる語へ置き換える
- 任意項目はラベルに「（任意）」を付ける
- 選択肢は保存値ではなく表示意味を主にする（例: `active` → `公開中`）
- 既存 frontmatter のキー・保存値は変更しない

## フォームの情報設計

Sveltia CMS はフィールドをセクション化する UIを標準で提供していない（`widget: object` にネストすると frontmatter の構造自体が変わるため採用しない）。代わりに `public/admin/config.yml` 側で次の優先順位で `fields` を並べ、グループごとに `#` コメントで区切る。

1. **基本情報**（公開に必須な項目）— タイトル・概要など
2. **公開設定** — 公開日/ステータス、下書き/注目表示などのトグル
3. **本文** — 主規コンテンツ。基本情報・公開設定の直後に配置し、スクロール量を抑える
4. **分類・メタデータ（任意）** — カテゴリ・タグ・日付など
5. **関連 URL / 画像・SEO（任意）** — 外部リンクやシェア画像など、公開に必須ではない項目

新規作成時の最短経路は「1 → 2 → 3」だけで公開可能な状態になるようにする。順序を変える場合もこのグループ方針を維持し、フィールドの `name`（frontmatter キー）と保存値は変更しない。

## テスト運用

管理画面の回帰確認は `pnpm run test:admin` を使う。
このスクリプトは Playwright 専用ポート (`4335`) と `CI=1` を使って
毎回テスト用 Astro サーバーを起動するため、他リポジトリで起動中の
`localhost:4321` を誤って再利用しない。

## アクセシビリティ方針

- フォーカスリングは色だけに頼らず、outline + halo で表示する
- 最小タップ領域は 44px を目安にする
- `prefers-reduced-motion: reduce` ではホバー移動などの motion を実質無効化する
- ライト/ダークは本体サイトと同じ `localStorage.theme` /
  `data-theme` を優先し、未設定時のみ
  `prefers-color-scheme` をフォールバックとして使う
