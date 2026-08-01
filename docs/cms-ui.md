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

### フォント (issue #622)

`/admin` は `SiteLayout`（`BaseHead.astro` の `<Font />`）を経由しないため、
`src/pages/admin.astro` の `<head>` に直接
`<Font cssVariable="--font-display|--font-body|--font-mono" />`
（`astro:assets`）を追加し、本体サイトと同じ自己ホストフォント
（Shippori Mincho / BIZ UDPGothic / JetBrains Mono、ADR 0013）を読み込む。

Sveltia CMS 本体は `--sui-font-family-default` などのフォントトークンを
独自に `:root` へ動的注入するため、`theme.css` 側の `--cms-font-*` を
そのまま `body { font-family }` に書いても届かない。
`--sui-font-family-default` / `--sui-heading-font-family` /
`--sui-h1〜h6-font-family` / `--sui-tab-font-family` /
`--sui-textbox-font-family` / `--sui-control-font-family` を明示的に上書きし、
**Sveltia の動的注入がカスケードで後勝ちするため `!important` を付与する**
（`--sui-checkbox-*` 等と異なり、この変数群は Sveltia 側で `:root` に
既定値が明示されているため通常の詳細度では負ける）。

### 日本語化とテーマの一本化 (issue #622)

Sveltia CMS は `ja` ロケールを同梱しているが既定は `navigator.language` 依存で、
テーマも自身の prefs (`localStorage["sveltia-cms.prefs"]`、JSON) で管理する。
これを `src/pages/admin.astro` の **`import CMS from "@sveltia/cms"` より前**
（`<script is:inline>`）で明示的に書き込み、UI 全体（ログイン画面だけでなく
エディタ・ダイアログ・設定も含む）を日本語・サイト本体のテーマに固定する。

```js
const prefs = JSON.parse(localStorage.getItem("sveltia-cms.prefs") ?? "{}");
prefs.locale ??= "ja"; // 初回のみ既定。CMS 設定画面での変更は尊重する
prefs.theme = theme;   // サイト本体の localStorage["theme"] を毎回反映
localStorage.setItem("sveltia-cms.prefs", JSON.stringify(prefs));
```

**import 文の評価時点で Sveltia が prefs を読み込むため、
下の `<script>`（module script）内で書いても手遅れになる。**
対応するキー・スキーマが将来変わっても黙って握りつぶし、
`navigator.language` / Sveltia 既定のフォールバックに委ねる。

この結果、旧来の DOM 書き換え（`labelRules` / `localizeLoginText()`）は不要になり
削除した。Sveltia 公式訳と旧独自訳は語彙が異なる
（例: `Work with Local Repository` → 「ローカルレポジトリで作業」、
旧訳は「ローカルリポジトリで編集」）。

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

### プレビュー iframe へのフォント・テーマ注入 (issue #622)

プレビューは別ドキュメントの `<iframe class="preview" sandbox="allow-same-origin …">`
として描画されるため、親ページの `@font-face` や `<html data-theme>` は継承されない。

- **フォント**: `admin.astro` が親の `<style>` タグから `@font-face` を含むブロック
  （Astro Fonts API が出力する `:root { --font-* }` 変数定義も同じブロックに含まれる）
  を抽出し、`CMS.registerPreviewStyle(fontFaceCss, { raw: true })` で
  プレビュー内にも注入する。`preview.css` 側は
  `font-family: var(--font-body, "BIZ UDPGothic", …)` のように書き、
  注入が失敗しても現状どおり OS フォントに落ちるようにする。
- **テーマ**: `preview.css` は `:root[data-theme="dark"]` セレクタで切り替えるが、
  Sveltia はこの属性を iframe へ伝播しない。`admin.astro` 側で
  `iframe.preview` の `contentDocument.documentElement.dataset.theme` を
  親の値からミラーする（`iframe` の `load` イベントと、親 `<html data-theme>`
  の属性変化を監視する `MutationObserver` の両方で同期する。iframe の中身の
  構築完了は親 `document.body` の `MutationObserver` だけでは検知できない）。

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
文言そのものは issue #622 以降 Sveltia 公式の `ja` ロケール由来（DOM 書き換えでの独自訳ではない）。

| 表示ラベル例（ja ロケール） | 対応する英語 | 種別 |
| --- | --- | --- |
| `ローカルレポジトリで作業`, `テストレポジトリで作業` | `Work with Local/Test Repository` | `primary` |
| `保存`, `作成`, `投稿` | `Save`, `Create`, `Submit` | `primary` |
| `GitHub にログイン` | `Sign In with GitHub` | `secondary` |
| `プレビュー`, `公開`, `アップロード`, `メディア` | `Preview`, `Publish`, `Upload`, `Media` | `secondary` |
| `アクセストークンを使用してログイン` | `Sign In Using Access Token` | `subtle` |
| `キャンセル`, `閉じる`, `戻る`, `編集` | `Cancel`, `Close`, `Back`, `Edit` | `subtle` |
| `削除`, `破棄`, `リセット` | `Delete`, `Discard`, `Reset` | `danger` |

ログイン後のアカウントメニューには「(ローカル|テスト)レポジトリで作業中」という
接続状態表示が出る。「〜で作業」で終わる完全一致ではなくこの部分文字列に
`isLoginScreen()` がマッチしてしまわないよう、正規表現は行末アンカー
（`(ローカル|テスト)(リポジトリ|レポジトリ)で(編集|作業)$` 相当）で区別する。

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

ログイン画面 (`admin-smoke.spec.ts` / `admin-a11y.spec.ts`) に加えて、
`admin-editor.spec.ts` は dev 限定の `?test-repo` クエリ経由でコレクション一覧・
新規作成フォーム・プレビューペインまで検証する (issue #621、詳細は
[cms-ui-regression.md](./cms-ui-regression.md) の「ログイン不要でエディタ画面を
確認する」節)。OPFS 依存のため chromium プロジェクトのみ対象。

## アクセシビリティ方針

- フォーカスリングは色だけに頼らず、outline + halo で表示する
- 最小タップ領域は 44px を目安にする
- `prefers-reduced-motion: reduce` ではホバー移動などの motion を実質無効化する
- ライト/ダークは本体サイトと同じ `localStorage["theme"]` を
  Sveltia CMS の prefs (`localStorage["sveltia-cms.prefs"].theme`) へ
  毎回反映し（未設定時は Sveltia 自身の `"auto"` 判定に委ねる）、
  管理画面シェル・プレビュー iframe の両方を追従させる
  （`prefers-color-scheme` メディアクエリは CSS 側では使わない、
  `docs/design-system.md` の方針に合わせる）
