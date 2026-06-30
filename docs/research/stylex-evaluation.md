# StyleX 導入検討レポート

> 調査日: 2026-06-29
> 対象: keroway.com (Astro 7 / UnoCSS presetWind4 / Vercel static)
> 結論: **現時点では導入を見送る**（次回スタック刷新時の再評価候補として保持）

---

## TL;DR

- **StyleX は「JSX/JS 内でマークアップを書くフレームワーク」向けに最適化された CSS-in-JS コンパイラ**。Meta が Facebook/Instagram の「大規模・多人数 CSS」問題を解くために作ったもの。
- 本サイトは **Astro の HTML-first テンプレート（`.astro` の `class=` 属性）が主**で、React island は使っていない。StyleX が最も輝く「JS で style オブジェクトを合成する」使い方とアーキテクチャがそもそも噛み合わない。
- 専用統合 `astro-stylex` は **2024-02 で更新停止・StyleX 0.5.1 にピン留め**（現行は 0.19.0）。実質メンテされておらず、生きた経路は `unplugin-stylex` のみ。それでも Babel 変換を挟むため **ビルドが重くなる方向**。
- 現状の **UnoCSS + CSS変数トークン（`--kw-*`）+ Astro scoped style** は、個人ブログ規模では StyleX の主要メリット（衝突ゼロ合成・型安全・大規模チームのスケール）をほぼ必要としない。
- **移行コストは高く（全コンポーネント書き換え）、得られる運用上のメリットは小さい** → 無理に取り込む必要なし。

---

## 1. 現状アーキテクチャ（評価の前提）

| レイヤ | 実装 | 補足 |
|--------|------|------|
| デザイントークン | `src/styles/tokens.css`（244行, `--kw-*` CSS変数） | 一元管理済み。UnoCSS theme にもマッピング |
| ユーティリティ | UnoCSS `presetWind4` | Tailwind 互換のアトミック CSS |
| コンポーネントクラス | `uno.config.ts` の `shortcuts`（`kw-button`, `kw-chip`, `kw-section-head` ...） | 命名規約 `kw-*` で統一 |
| 局所スタイル | Astro scoped `<style>`（**28 ファイル**） | コンポーネント固有。スコープ衝突は Astro が解決済み |
| マークアップ | `.astro` の `class=` 属性（**29 ファイル**） | **HTML-first**。React/JSX island なし |

つまり既に「トークン集中管理 + アトミック + スコープ分離」が成立している。**StyleX が解決する課題の多くが、別の手段で既に解決済み**という点が重要。

---

## 2. StyleX とは（要点）

- **コンパイル時にアトミック CSS を静的抽出**する Babel プラグイン + 極小ランタイム。
- スタイルは **JS オブジェクトとして `stylex.create()` で定義**し、`stylex.props()`（JSX 用）/ `stylex.attrs()`（文字列テンプレート用）で適用する。
- **同一ファイル内で定義・使用が完結すれば実行時コストはゼロ**。動的合成時のみ極小ランタイムが class 名をマージ。
- **last-write-wins を保証**する衝突ゼロ合成（CSS の insertion order / specificity に依存しない）。
- **型安全**: TypeScript/Flow で CSS プロパティ名・値が型チェックされる。`StyleXStyles<{...}>` で「受け取れる style を color/bg のみに制限」等が可能。
- `defineVars` で **型付き・import 可能なデザイントークン**（モノレポでのパッケージ間共有に強い）。

---

## 3. Pros（StyleX の利点）

| # | 利点 | 本サイトでの実効性 |
|---|------|-------------------|
| P1 | **衝突ゼロのスタイル合成（last-write-wins 保証）** | △ 個人開発・少コンポーネントでは specificity 衝突がほぼ起きない。UnoCSS + scoped style で既に回避できている |
| P2 | **型安全な CSS**（プロパティ名 typo をコンパイル時に検出） | ○ 一定の魅力。ただし UnoCSS も `presetWind4` + エディタ補完である程度カバー |
| P3 | **import 可能な型付きトークン（`defineVars`）** | △ 既に `--kw-*` CSS変数で集中管理済み。単一リポなので「パッケージ間共有」メリットは効かない |
| P4 | **実行時コスト実質ゼロ・静的 CSS 出力** | △ UnoCSS / Astro scoped style も実行時注入なしの静的 CSS。差は出ない |
| P5 | **大規模・多人数開発でのスケール**（Meta 実績） | ✕ 1人運用の個人ブログでは便益が出る規模ではない |
| P6 | **RSC / SSR 安全**（静的 CSS、ハイドレーション不要） | △ Astro static 出力では UnoCSS も同様に安全 |

---

## 4. Cons（StyleX の欠点・本プロジェクト固有の障壁）

| # | 欠点 | 深刻度 |
|---|------|:------:|
| C1 | **Astro の HTML-first と相性が悪い。** StyleX は「JS で markup を組む」前提。`.astro` テンプレートの `class=` に直接ユーティリティを書く現在のスタイルとはパラダイムが逆。`.astro` frontmatter で `stylex.create()` → `stylex.attrs()` を呼び、テンプレートにスプレッドする書き方を全コンポーネントに強制することになる | **高** |
| C2 | **専用統合 `astro-stylex` が事実上メンテ停止。** 最終公開 2024-02-04 / `@stylexjs/stylex@0.5.1` にピン（現行 0.19.0）。生きた経路は `unplugin-stylex`(2026-05 更新) のみ | **高** |
| C3 | **ビルドが重くなる。** StyleX は Babel 変換が必須。Astro/Vite/Rollup パイプラインに Babel を一段挟む＝コールド/インクリメンタルともビルド速度は低下方向。Tailwind v4 / UnoCSS は Rust/JIT で逆に速い | 中 |
| C4 | **セットアップ・設定コストが高い**（公称 30–60分 vs UnoCSS/Tailwind 5分）。`unstable_moduleResolution` 等の設定項目が多い | 中 |
| C5 | **移行に自動ツールなし・全コンポーネント書き換え。** UnoCSS shortcuts / scoped style / `class=` を全て `stylex.create` オブジェクトへ手作業移植。28 の `<style>` ＋ 29 の `class=` 利用ファイルが対象 | **高** |
| C6 | **エコシステムが小さい**（週300K DL / shadcn 等の Tailwind 系部品資産が使えない）。※本サイトは部品ライブラリ未使用なので影響は限定的 | 低 |
| C7 | **二重管理リスク。** Markdoc 由来の本文 HTML（`.prose` 等）や Pagefind UI、Sveltia CMS が吐く DOM は StyleX の管理外。結局グローバル CSS / scoped style が残り、**StyleX と従来 CSS の二重体制**になる | 中 |

---

## 5. Astro × StyleX の技術的現実

- `.astro` で使う場合、JSX の `className` ではなく **`stylex.attrs()`**（`class` 文字列 + シリアライズ済み `style` 文字列を返す）を使う:

  ```astro
  ---
  import * as stylex from '@stylexjs/stylex';
  const styles = stylex.create({
    card: { borderRadius: '0.5rem', padding: '1.5rem', backgroundColor: 'white' },
  });
  const attrs = stylex.attrs(styles.card);
  ---
  <div class={attrs.class} style={attrs.style}>...</div>
  ```

- これは **現状の `<div class="kw-card">` よりも明確に冗長**。frontmatter にスタイル定義が増え、テンプレートと定義が分離する。Astro の「HTML を素直に書く」良さを削ぐ。
- island（React 等）を導入していれば StyleX の旨味が出るが、**本サイトに island はない**。

---

## 6. 代替案（StyleX を入れずに「メリットだけ」拾う）

StyleX 導入の動機が「型安全」「トークンの一貫性」なら、より低コストな打ち手がある:

1. **UnoCSS の維持 + トークンの型付け強化** — `tokens.css` の `--kw-*` を TS 定数（`as const`）でもエクスポートし、参照を型で縛る。Babel 不要・移行ゼロ。
2. **Tailwind/UnoCSS の `@theme` 的トークン集約は既に達成済み** — 追加投資不要。
3. **scoped style の重複が気になる箇所だけ** `uno.config.ts` shortcuts に巻き取る — 漸進的・低リスク。
4. **将来 React island を本格導入する場合のみ** StyleX を island 配下に限定導入する選択肢を再評価。

---

## 7. 判断

| 観点 | 評価 |
|------|------|
| 性能向上 | **ほぼ無し**（むしろ Babel 経由でビルドは遅くなる方向） |
| メンテナンス性向上 | **限定的**（型安全は得られるが、Astro 統合の保守リスク・二重体制で相殺） |
| 移行コスト | **高**（全コンポーネント手作業書き換え、自動ツールなし） |
| 規模適合 | **不適合**（StyleX は多人数・大規模向け。個人ブログには過剰） |
| Astro 適合 | **低**（HTML-first と逆方向。専用統合は実質放置） |

### 結論

**現時点では導入しない。** 運用上の明確なメリット（性能・保守）が移行コストとリスクを上回らない。現行の「UnoCSS presetWind4 + `--kw-*` トークン + Astro scoped style」は本サイト規模に対して妥当でバランスが良い。

### 再評価のトリガー（次回参考）

- React/Preact/Solid の **island を本格導入**し、JS 内スタイリングの比率が上がったとき
- サイトが **複数アプリ/モノレポ化**し、型付きトークンのパッケージ間共有が要るとき
- `unplugin-stylex` 系の **Astro 統合が安定・公式化**し、Babel なしの高速経路が整ったとき

---

## 付録: 調査時点のバージョン情報

| パッケージ | 最新 | 最終更新 | 状態 |
|-----------|------|---------|------|
| `@stylexjs/stylex` | 0.19.0 | 2026-06-16 | 活発 |
| `unplugin-stylex`（Astro 経路） | 0.6.3 | 2026-05-14 | 活発 |
| `astro-stylex`（専用統合） | 0.3.0 | **2024-02-04** | **実質停止**（StyleX 0.5.1 ピン） |

### 参考リンク

- StyleX 公式 — Thinking in StyleX: <https://stylexjs.com/docs/learn/thinking-in-stylex/>
- StyleX `attrs` API（非 JSX 用）: <https://stylexjs.com/docs/api/javascript/attrs/>
- unplugin-stylex（Astro 統合あり）: <https://github.com/eryue0220/unplugin-stylex>
- StyleX vs Tailwind 2026 比較: <https://www.pkgpulse.com/guides/stylex-vs-tailwind-2026>
