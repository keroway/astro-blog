# 0001 — CSS フレームワーク選定: UnoCSS 採用

- **ステータス**: Accepted
- **決定日**: 2026-05-14
- **決定者**: @keroway
- **関連 Issue**: [#114 ADR 起票: CSS フレームワーク・スタイリング戦略](https://github.com/keroway/astro-blog/issues/114)、[#118](https://github.com/keroway/astro-blog/issues/118)
- **関連 PR**: [#111 Kanagawa デザインシステム導入](https://github.com/keroway/astro-blog/pull/111)

---

## コンテキスト

keroway.com は Astro 6 で構築された個人ポートフォリオ兼テクニカルブログです。

旧 Issue #14「CSS フレームワーク 3 候補の比較表を作成」で Tailwind CSS v4 / UnoCSS / 純 CSS 単独継続の 3 案を比較・PoC を実施しました。当初は **純 CSS 単独継続** を選択しましたが、旧 Issue #60 で追加検討を行い、最終的には保留としていました。

その後、PR #111 で **Kanagawa デザインシステム**（北斎「神奈川沖浪裏」をパレットの起点とする `--kw-*` CSS カスタムプロパティ群）を導入しました。デザイントークンが整備されたことで「ユーティリティクラスとトークンを型安全に橋渡しするレイヤー」の必要性が明確になり、Issue #114 で CSS フレームワーク選定を改めて正式対応することになりました。

---

## 決定事項

**UnoCSS (`@unocss/astro` 経由) を採用し、`presetWind4` をベースプリセットとして使用する。**

具体的な構成:

- **プリセット**: `presetWind4`（Tailwind v4 互換ユーティリティ、Astro 統合時は `preflights.reset: false` でリセット CSS を無効化）
- **ダークモード**: `[data-theme="dark"]` 属性セレクタへの対応（`dark: { dark: '[data-theme="dark"]' }`）
- **テーマブリッジ**: `uno.config.ts` の `extendTheme` で `--kw-*` CSS カスタムプロパティを UnoCSS カラー・スペーシング・半径・シャドウトークンとして登録
  ```ts
  // 例: colors.kw.bg.DEFAULT → var(--kw-bg)
  theme.colors.kw = { bg: { DEFAULT: "var(--kw-bg)", ... } }
  ```
- **ショートカット**: `uno.config.ts` の `shortcuts` で `kw-button`・`kw-chip`・`kw-eyebrow`・`kw-section-head` 等のコンポーネントクラスを定義し、`global.css` のユーティリティ定義を集約
- **トークン定義元**: `src/styles/tokens.css`（`--kw-*` 変数を `:root` / `[data-theme]` に定義）; UnoCSS はこれを参照するだけで値を複製しない

---

## 却下した候補

### Tailwind CSS v4

**却下理由**:

1. **トークン干渉の懸念**: Tailwind CSS v4 は `@theme inline` / CSS-first アプローチを採用しており、既存の `--kw-*` トークン群と変数名空間が衝突する可能性がある。Tailwind が生成するデフォルト変数（例: `--color-*`）を全て無効化・上書きするコストが高く、将来のバージョンアップ時にも追跡コストが発生する。
2. **Astro 統合の成熟度**: `@astrojs/tailwind` は Tailwind CSS v4 への対応が過渡期にあり、`@unocss/astro` と比較して安定性で劣る。UnoCSS は Astro の公式インテグレーション一覧でも実績があり、`presetWind4` による Tailwind v4 互換 API も提供されている。

### 純 CSS 単独継続

**却下理由**:

1. **再利用性の低さ**: ユーティリティ的なスタイル定義がコンポーネントごとに分散し、新規ページ追加時に同じパターンを繰り返す必要が生じる。特に Kanagawa デザインシステムのコンポーネントクラス（ボタン・チップ・セクションヘッド等）は複数ページで共有されるため、CSS の重複が顕在化する。
2. **トークンとの橋渡し不足**: `--kw-*` 変数をコンポーネント内で直接 `var()` 参照するだけでは、エディタ補完・静的解析・未使用クラスのパージが得られない。UnoCSS の `extendTheme` を使うことでこれらを解決できる。
3. **スケール困難**: コンテンツ量の増加に伴い、グローバル CSS の見通しが悪化する。ショートカット機構によって命名の統一と管理の一元化が図れる。

---

## Kanagawa デザインシステムとの両立方針

- **単一情報源**: トークンの実値は `src/styles/tokens.css` が唯一の定義元。UnoCSS はトークンの値を複製せず、`var(--kw-*)` 参照のみを theme に登録する。
- **命名規則の統一**: UnoCSS クラス名は `kw-` プレフィックスを使用し、CSS カスタムプロパティの `--kw-` 名前空間と対称になるように設計する。
- **ダークモード共存**: `data-theme="dark"` 属性を切り替えるだけで `--kw-*` トークンが自動的に差し替わる設計のため、UnoCSS 側の `dark:` バリアント設定（属性セレクタ対応）と完全に整合する。
- **global.css との役割分担**: リセット CSS・base スタイル・prose スタイル・アニメーション定義は `global.css` に残す。ユーティリティ的なコンポーネントクラスは `uno.config.ts` の `shortcuts` に移行する。

---

## 経緯の要約

| 時期 | Issue / PR | 決定 |
|------|-----------|------|
| 初期 | #14 | 3 候補を比較・PoC 実施 |
| 中期 | #60 | 追加検討、保留 |
| PR #111 後 | — | Kanagawa デザインシステム導入、ユーティリティレイヤーの必要性が顕在化 |
| 最終 | #114, #118 | UnoCSS 採用を正式決定（本 ADR） |

---

## 結果

UnoCSS を採用することで以下が実現できます:

- Kanagawa デザインシステムの `--kw-*` トークンを型安全に UnoCSS テーマへブリッジできる
- コンポーネントクラスを `shortcuts` で一元管理し、新規ページ追加時の再利用性が向上する
- `presetWind4` により Tailwind CSS v4 互換のユーティリティ API を利用しつつ、Astro 統合の安定性を確保できる
- トークンの単一情報源 (`tokens.css`) を維持したまま、エディタ補完と静的解析の恩恵を受けられる
