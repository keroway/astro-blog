# CMS UI 改善メモ

- **対象**: `/admin/` (Sveltia CMS)
- **関連 ADR**: [0016 — CMS を Keystatic から Sveltia CMS へ移行する](./adr/0016-cms-keystatic-to-sveltia.md)

## テーマ適用

管理画面のプロダクト感を keroway.com 本体に寄せるため、Sveltia CMS の SPA に対して `public/admin/theme.css` を読み込む。

```html
<link rel="stylesheet" href="/admin/theme.css" />
```

この CSS は Sveltia CMS の内部実装に強く依存しすぎないよう、次の範囲に留める。

- CMS 専用のデザイントークン（色、角丸、影、フォーカス）
- `button` / `[role="button"]` / form controls の基礎スタイル
- `data-keroway-admin-action` など、`src/pages/admin.astro` 側で付与する安定したセマンティック hook

## ボタン種別

| 種別 | 用途 |
| --- | --- |
| `primary` | 推奨導線、保存、作成など最重要アクション |
| `secondary` | GitHub ログイン、プレビューなど主操作に準じるアクション |
| `subtle` | 補助操作、キャンセル、閉じる |
| `danger` | 削除、破棄など破壊的操作 |

## フィールド文言の方針

`public/admin/config.yml` のラベル・ヒントは、久しぶりに開いても判断できることを優先する。

- 日本語を主表記にする
- `OG` / `Canonical` などの略語は、必要に応じて「SNS シェア画像」「正規 URL」のように用途が分かる語へ置き換える
- 任意項目はラベルに「（任意）」を付ける
- 選択肢は保存値ではなく表示意味を主にする（例: `active` → `公開中`）
- 既存 frontmatter のキー・保存値は変更しない

## アクセシビリティ方針

- フォーカスリングは色だけに頼らず、outline + halo で表示する
- 最小タップ領域は 44px を目安にする
- `prefers-reduced-motion: reduce` ではホバー移動などの motion を実質無効化する
- ライト/ダークは `prefers-color-scheme` に追従する
