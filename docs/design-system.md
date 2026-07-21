# Kanagawa デザインシステム

> パレット: 葛飾北斎「神奈川沖浪裏」に着想した紺碧・白浪・砂金を基調に、
> 東海道の道筋と朱印アクセントを重ねた、横浜発の技術手控え向けデザインシステム。

---

## 目次

1. [カラーパレット](#1-カラーパレット)
2. [タイポグラフィスケール](#2-タイポグラフィスケール)
3. [余白・グリッド](#3-余白グリッド)
4. [コンポーネント命名規則](#4-コンポーネント命名規則)
5. [`--kw-*` トークン変数表](#5----kw--トークン変数表)
6. [3カラムグリッド・縦書きレール仕様](#6-3カラムグリッド縦書きレール仕様)
7. [コンポーネント用途と使い分け](#7-コンポーネント用途と使い分け)
8. [フォント設定](#8-フォント設定)
9. [モチーフ語彙](#9-モチーフ語彙)

---

## 1. カラーパレット

### 1.1 プリミティブカラー

プリミティブカラーは具体的な色値を保持する最下層のトークンです。セマンティックトークンはこれらを参照します。

| トークン | light 値 | dark 値 | 意味 |
|---|---|---|---|
| `--kw-navy` | `#003366` | `#9CB4DA` | 紺碧・主役色 |
| `--kw-blue` | `#1E50A2` | `#7AA2D0` | 水色・インタラクション色 |
| `--kw-paper` | `#F3F1EC` | `#0B1B33` | わずかに温かい紙白・主背景 |
| `--kw-paper-warm` | `#E9DECB` | `#0F2244` | 温かみのある紙色・代替背景 |
| `--kw-paper-card` | `#FFFDF8` | `#122548` | カード背景 |
| `--kw-sand` | `#D9B382` | `#D9B382` | 砂金・アクセント（両モード共通） |
| `--kw-sand-soft` | `rgba(217,179,130,0.45)` | `rgba(217,179,130,0.30)` | 砂金の薄掛け |
| `--kw-vermilion` | `#B43D2F` | `#E07A66` | 朱印・強アクセント |
| `--kw-vermilion-soft` | `rgba(180,61,47,0.14)` | `rgba(224,122,102,0.16)` | 朱の薄掛け |
| `--kw-road` | `#5E7892` | `#8CA6BD` | 東海道の道筋 |
| `--kw-road-soft` | `rgba(94,120,146,0.14)` | `rgba(140,166,189,0.14)` | 道筋の太い下地 |
| `--kw-ink` | `#0B1B33` | `#E8EDF6` | 墨・主テキスト |
| `--kw-ink-dim` | `#4A5874` | `#9AA6BD` | 薄墨・補助テキスト |
| `--kw-ink-faint` | `#8290AC` | `#6E7A94` | 最薄墨・装飾テキスト |
| `--kw-rule` | `rgba(0,51,102,0.16)` | `rgba(232,237,246,0.18)` | 罫線 |
| `--kw-rule-soft` | `rgba(0,51,102,0.08)` | `rgba(232,237,246,0.08)` | 薄罫線 |
| `--kw-rule-strong` | `rgba(0,51,102,0.28)` | `rgba(232,237,246,0.32)` | 強罫線 |

### 1.2 セマンティックカラー

用途を明示したトークンです。実装では必ずセマンティックトークンを使用します（プリミティブを直接参照しない）。

#### 背景 (Background)

| トークン | light の参照先 | dark の参照先 | 用途 |
|---|---|---|---|
| `--kw-bg` | `--kw-paper` | `--kw-paper` | ページ主背景 |
| `--kw-bg-card` | `--kw-paper-card` | `--kw-paper-card` | カード・フローティング要素 |
| `--kw-bg-alt` | `--kw-paper-warm` | `--kw-paper-warm` | コードブロック・代替背景 |
| `--kw-bg-inverse` | `--kw-navy` | `--kw-ink` | 反転背景（ヒーロー等） |

#### 前景 (Foreground)

| トークン | light の参照先 | dark の参照先 | 用途 |
|---|---|---|---|
| `--kw-fg` | `--kw-ink` | `--kw-ink` | 主テキスト |
| `--kw-fg-muted` | `--kw-ink-dim` | `--kw-ink-dim` | 補助テキスト・メタ情報 |
| `--kw-fg-faint` | `--kw-ink-faint` | `--kw-ink-faint` | 装飾テキスト・縦書きレール |
| `--kw-fg-display` | `--kw-navy` | `--kw-navy` | 見出し・ブランド表示 |
| `--kw-fg-link` | `--kw-blue` | `--kw-blue` | リンク・インタラクション |
| `--kw-fg-on-navy` | `--kw-paper` | `--kw-paper` | navy 背景上のテキスト |

#### アクセント

| トークン | 参照先 | 用途 |
|---|---|---|
| `--kw-accent` | `--kw-sand` | 砂金アクセント（番号・区切り線） |
| `--kw-accent-soft` | `--kw-sand-soft` | アクセントの薄掛け（選択状態） |
| `--kw-accent-strong` | `--kw-vermilion` | 朱の強アクセント（朱印・hover・小さな active 表現） |
| `--kw-accent-strong-soft` | `--kw-vermilion-soft` | 朱の薄掛け |

#### ボタン

| トークン | light 値 | dark 値 | 用途 |
|---|---|---|---|
| `--kw-btn-primary-bg` | `--kw-navy` | `--kw-blue` | プライマリボタン背景 |
| `--kw-btn-primary-fg` | `--kw-paper` | `--kw-paper` | プライマリボタン文字色 |
| `--kw-btn-primary-hover` | `--kw-blue` | `--kw-navy` | プライマリボタンホバー背景 |
| `--kw-btn-ghost-fg` | `--kw-navy` | `--kw-ink` | ゴーストボタン文字色 |
| `--kw-btn-ghost-border` | `--kw-rule-strong` | `--kw-rule-strong` | ゴーストボタン枠線 |

#### ステータスピル

works エントリのステータス表示に使用する 3種。

| ステータス | トークン (fg / bg) | light fg | dark fg |
|---|---|---|---|
| `active` | `--kw-status-active-fg` / `-bg` | `--kw-blue` | `#B3CCEC` |
| `wip` | `--kw-status-wip-fg` / `-bg` | `#8A5A1F` | `--kw-sand` |
| `archived` | `--kw-status-archived-fg` / `-bg` | `--kw-ink-dim` | `--kw-ink-dim` |

---

## 2. タイポグラフィスケール

### 2.1 フォントファミリー

| トークン | 値 |
|---|---|
| `--kw-font-display` | `'Shippori Mincho', 'YuMincho', '游明朝', 'Hiragino Mincho ProN', 'Noto Serif JP', serif` |
| `--kw-font-body` | `'BIZ UDPGothic', 'Hiragino Sans', 'Yu Gothic', 'YuGothic', 'Noto Sans JP', sans-serif` |
| `--kw-font-mono` | `'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |

### 2.2 フォントサイズ

#### ディスプレイ（大見出し・ヒーロー）

| トークン | 値 | 使用例 |
|---|---|---|
| `--kw-fs-display-xl` | `96px` | About ページマストヘッド見出し |
| `--kw-fs-display-lg` | `72px` | ホームページヒーロー見出し |
| `--kw-fs-display-md` | `40px` | フッターキャッチコピー |
| `--kw-fs-display-sm` | `32px` | SectionHead タイトル、レスポンシブ縮小時のヒーロー |

#### 見出し（article 内）

| トークン | 値 | HTML 要素 |
|---|---|---|
| `--kw-fs-h1` | `56px` | `<h1>` |
| `--kw-fs-h2` | `32px` | `<h2>` |
| `--kw-fs-h3` | `22px` | `<h3>`（FocusCard タイトル等） |
| `--kw-fs-h4` | `18px` | `<h4>` |

#### 本文・モノスペース

| トークン | 値 | 用途 |
|---|---|---|
| `--kw-fs-body-lg` | `17px` | リード文・長文 |
| `--kw-fs-body` | `16px` | 通常本文 |
| `--kw-fs-body-sm` | `14px` | 補助テキスト・FocusCard 説明・フッターリンク |
| `--kw-fs-mono` | `13px` | モノスペース標準・縦書きレールテキスト |
| `--kw-fs-mono-sm` | `12px` | ヘッダーナビ・ヘッダーブランド名 |
| `--kw-fs-mono-xs` | `10px` | アイウェイブロウ・ステータスチップ |

### 2.3 フォントウェイト

| トークン | 値 | 適用箇所 |
|---|---|---|
| `--kw-fw-regular` | `400` | 通常テキスト |
| `--kw-fw-medium` | `500` | 見出し・ボタン |
| `--kw-fw-semibold` | `600` | 強調 |
| `--kw-fw-bold` | `700` | `<strong>`, `<b>` |

### 2.4 行間 (line-height)

| トークン | 値 | 適用箇所 |
|---|---|---|
| `--kw-lh-tight` | `1.05` | ディスプレイ見出し |
| `--kw-lh-snug` | `1.25` | カードタイトル等 |
| `--kw-lh-normal` | `1.6` | 短文説明 |
| `--kw-lh-relaxed` | `1.85` | 通常本文（`<html>` デフォルト） |
| `--kw-lh-prose` | `1.9` | 長文プロース・リード |

### 2.5 字間 (letter-spacing)

| トークン | 値 | 適用箇所 |
|---|---|---|
| `--kw-ls-display` | `0` | ディスプレイ見出し |
| `--kw-ls-body` | `0` | 通常本文 |
| `--kw-ls-mono` | `0` | モノスペース |
| `--kw-ls-eyebrow` | `0.3em` | アイウェイブロウ・**英語大文字**ラベル |
| `--kw-ls-eyebrow-ja` | `0.05em` | **日本語**アイウェイブロウ（CJK で 0.3em は開きすぎるため抑えた変種） |
| `--kw-ls-eyebrow-lg` | `0.4em` | 大型アイウェイブロウ |
| `--kw-ls-button` | `0.1em` | ボタンラベル |

#### アイウェイブロウの言語別ルール

アイウェイブロウ（モノスペースの小ラベル）は中身の言語で字間を出し分ける。

- **英語 / ラテン大文字ラベル**（`SHARE`, `RELATED`, `STARTED`, `vol. iii · software` 等）: `kw-eyebrow` を使い `--kw-ls-eyebrow`（`0.3em`）。大文字の間に余白を取ることで銘板のような質感を出す。
- **日本語ラベル**（`物理層`, `前の記事`, `言語` 等）: `kw-eyebrow-ja` を使い `--kw-ls-eyebrow-ja`（`0.05em`）。CJK では `0.3em` だと「物 理 層」のように字が離れて読みにくくなるため、字間をほぼ詰めた変種を用いる。
- **日英混在ラベル**（`Mar 13, 2018 · 読書` のようなメタ）: ラテン主体なら `kw-eyebrow`（`0.3em`）を維持、漢数字・日本語主体なら `kw-eyebrow-ja` に寄せる。可読性を優先して個別判断する。
- スコープド CSS で `var(--kw-ls-eyebrow)` を直接参照している箇所も同じ基準で、日本語主体なら `var(--kw-ls-eyebrow-ja)` に差し替える。

> トークン `--kw-ls-eyebrow`（`0.3em`）自体は英語ラベル用に維持する。日本語側は別トークン `--kw-ls-eyebrow-ja` で吸収し、`0.3em` を潰さない。

---

## 3. 余白・グリッド

### 3.1 スペーシングスケール

8px ベースのスペーシングスケールです。

| トークン | 値 |
|---|---|
| `--kw-space-1` | `4px` |
| `--kw-space-2` | `8px` |
| `--kw-space-3` | `12px` |
| `--kw-space-4` | `16px` |
| `--kw-space-5` | `20px` |
| `--kw-space-6` | `24px` |
| `--kw-space-8` | `32px` |
| `--kw-space-10` | `40px` |
| `--kw-space-12` | `48px` |
| `--kw-space-16` | `64px` |
| `--kw-space-20` | `80px` |
| `--kw-space-24` | `96px` |

### 3.2 角丸 (border-radius)

| トークン | 値 | 用途例 |
|---|---|---|
| `--kw-radius-none` | `0` | エッジシャープ要素 |
| `--kw-radius-xs` | `2px` | インラインコード、フォーカスリング |
| `--kw-radius-sm` | `4px` | ボタン |
| `--kw-radius-md` | `6px` | コードブロック・カードサムネイル |
| `--kw-radius-lg` | `8px` | カード |
| `--kw-radius-pill` | `9999px` | ピル型チップ |

### 3.3 エレベーション (shadow)

| トークン | 値 | 用途 |
|---|---|---|
| `--kw-shadow-none` | `none` | 影なし |
| `--kw-shadow-card` | `0 10px 30px rgba(0,51,102,0.08), 0 1px 0 rgba(0,51,102,0.08)` | カードの柔らかいドロップシャドウ |
| `--kw-shadow-pop` | `0 18px 48px rgba(0,51,102,0.16), 0 3px 10px rgba(0,51,102,0.10)` | ポップアップ・ドロップダウン |

### 3.4 ボーダー

| トークン | 値 | 用途 |
|---|---|---|
| `--kw-border-hair` | `1px solid var(--kw-rule)` | 標準罫線 |
| `--kw-border-soft` | `1px solid var(--kw-rule-soft)` | 薄罫線（行間仕切り） |
| `--kw-border-strong` | `1px solid var(--kw-rule-strong)` | 強調罫線 |
| `--kw-border-accent` | `1px solid var(--kw-accent)` | アクセントカラー罫線 |

### 3.5 モーション

| トークン | 値 | 用途 |
|---|---|---|
| `--kw-duration-fast` | `140ms` | ホバー・フォーカストランジション |
| `--kw-duration-normal` | `220ms` | パネル開閉等 |
| `--kw-easing` | `cubic-bezier(0.4, 0, 0.2, 1)` | 標準イージング（Material Design 準拠） |

### 3.6 レイアウト定数

| トークン | 値 | 用途 |
|---|---|---|
| `--kw-rail-width` | `64px` | 縦書きレール幅 |
| `--kw-content-max` | `1100px` | コンテンツ最大幅 |
| `--kw-prose-max` | `72ch` | プロースエリア最大幅 |

---

## 4. コンポーネント命名規則

### 4.1 CSS クラス命名

`kw-` プレフィックスを持つ BEM 変形を採用します。

```
kw-{block}
kw-{block}__{element}
kw-{block}--{modifier}
```

**例:**
- `.kw-rail` — ブロック（縦書きレール）
- `.kw-rail__text` — エレメント（レール内テキスト）
- `.kw-rail--right` — モディファイア（右レール）

### 4.2 CSS カスタムプロパティ命名

`--kw-{category}-{scale}` の形式を取ります。

```
--kw-{color|font|fs|fw|lh|ls|space|radius|shadow|border|duration}-{name}
```

**例:** `--kw-fs-display-lg`, `--kw-space-6`, `--kw-btn-primary-bg`

### 4.3 Astro コンポーネント命名

PascalCase。コンポーネントが代表する UI 概念を名詞で表現します。

| ファイル名 | 役割の分類 |
|---|---|
| `SiteLayout.astro` | ページ全体ラッパー（レイアウト） |
| `BlogPost.astro` | ブログ記事ラッパー（レイアウト） |
| `SectionHead.astro` | セクション見出し（汎用コンポーネント） |
| `FocusCard.astro` | 専門分野カード（汎用コンポーネント） |
| `Monogram.astro` | ブランドシグネチャ（汎用コンポーネント） |
| `Header.astro` | サイトヘッダー（構造コンポーネント） |
| `Footer.astro` | サイトフッター（構造コンポーネント） |

### 4.4 UnoCSS Shortcuts 命名

`kw-{component}` または `kw-{component}__{element}` の形式で定義します。Shortcut が表現できない CSS プロパティ（`writing-mode`, `!important`, `:hover` 等）は `global.css` に残します。

---

## 5. `--kw-*` トークン変数表

全トークンの一覧です。詳細な値は「カラーパレット」「タイポグラフィスケール」「余白・グリッド」の各セクションを参照してください。

### カラートークン（light / dark）

| 変数名 | 種別 | 用途 |
|---|---|---|
| `--kw-navy` | Primitive | 紺碧・主役色 |
| `--kw-blue` | Primitive | 水色・インタラクション |
| `--kw-paper` | Primitive | 紙白 |
| `--kw-paper-warm` | Primitive | 温紙色 |
| `--kw-paper-card` | Primitive | カード白 |
| `--kw-sand` | Primitive | 砂金アクセント |
| `--kw-sand-soft` | Primitive | 砂金薄掛け |
| `--kw-vermilion` | Primitive | 朱印・強アクセント |
| `--kw-vermilion-soft` | Primitive | 朱の薄掛け |
| `--kw-road` | Primitive | 東海道の道筋 |
| `--kw-road-soft` | Primitive | 道筋の下地 |
| `--kw-ink` | Primitive | 墨・主テキスト |
| `--kw-ink-dim` | Primitive | 薄墨 |
| `--kw-ink-faint` | Primitive | 最薄墨 |
| `--kw-rule` | Primitive | 罫線色 |
| `--kw-rule-soft` | Primitive | 薄罫線色 |
| `--kw-rule-strong` | Primitive | 強罫線色 |
| `--kw-bg` | Semantic | ページ主背景 |
| `--kw-bg-card` | Semantic | カード背景 |
| `--kw-bg-alt` | Semantic | 代替背景 |
| `--kw-bg-inverse` | Semantic | 反転背景 |
| `--kw-fg` | Semantic | 主テキスト |
| `--kw-fg-muted` | Semantic | 補助テキスト |
| `--kw-fg-faint` | Semantic | 装飾テキスト |
| `--kw-fg-display` | Semantic | 見出し色 |
| `--kw-fg-link` | Semantic | リンク色 |
| `--kw-fg-on-navy` | Semantic | navy 背景上のテキスト |
| `--kw-accent` | Semantic | アクセントカラー |
| `--kw-accent-soft` | Semantic | アクセント薄掛け |
| `--kw-accent-strong` | Semantic | 強アクセントカラー |
| `--kw-accent-strong-soft` | Semantic | 強アクセント薄掛け |
| `--kw-btn-primary-bg` | Component | プライマリボタン背景 |
| `--kw-btn-primary-fg` | Component | プライマリボタン文字 |
| `--kw-btn-primary-hover` | Component | プライマリボタンホバー背景 |
| `--kw-btn-ghost-fg` | Component | ゴーストボタン文字 |
| `--kw-btn-ghost-border` | Component | ゴーストボタン枠線 |
| `--kw-status-active-fg` | Component | active ステータス文字色 |
| `--kw-status-active-bg` | Component | active ステータス背景 |
| `--kw-status-wip-fg` | Component | wip ステータス文字色 |
| `--kw-status-wip-bg` | Component | wip ステータス背景 |
| `--kw-status-archived-fg` | Component | archived ステータス文字色 |
| `--kw-status-archived-bg` | Component | archived ステータス背景 |

### タイポグラフィトークン（:root 固定）

| 変数名 | 値 | 用途 |
|---|---|---|
| `--kw-font-display` | Shippori Mincho スタック | 見出し・本文フォント |
| `--kw-font-body` | BIZ UDPGothic スタック | 本文フォント |
| `--kw-font-mono` | JetBrains Mono スタック | コード・ラベル |
| `--kw-fs-display-xl` | `96px` | 最大ディスプレイ |
| `--kw-fs-display-lg` | `72px` | 大ディスプレイ |
| `--kw-fs-display-md` | `40px` | 中ディスプレイ |
| `--kw-fs-display-sm` | `32px` | 小ディスプレイ |
| `--kw-fs-h1` | `56px` | 見出し 1 |
| `--kw-fs-h2` | `32px` | 見出し 2 |
| `--kw-fs-h3` | `22px` | 見出し 3 |
| `--kw-fs-h4` | `18px` | 見出し 4 |
| `--kw-fs-body-lg` | `17px` | 大本文 |
| `--kw-fs-body` | `16px` | 通常本文 |
| `--kw-fs-body-sm` | `14px` | 小本文 |
| `--kw-fs-mono` | `13px` | モノスペース標準 |
| `--kw-fs-mono-sm` | `12px` | モノスペース小 |
| `--kw-fs-mono-xs` | `10px` | モノスペース最小 |
| `--kw-fw-regular` | `400` | 通常ウェイト |
| `--kw-fw-medium` | `500` | 中ウェイト |
| `--kw-fw-semibold` | `600` | セミボールド |
| `--kw-fw-bold` | `700` | ボールド |
| `--kw-lh-tight` | `1.05` | 詰め行間 |
| `--kw-lh-snug` | `1.25` | スナグ行間 |
| `--kw-lh-normal` | `1.6` | 通常行間 |
| `--kw-lh-relaxed` | `1.85` | ゆったり行間 |
| `--kw-lh-prose` | `1.9` | 長文行間 |
| `--kw-ls-display` | `0` | ディスプレイ字間 |
| `--kw-ls-body` | `0` | 本文字間 |
| `--kw-ls-mono` | `0` | モノ字間 |
| `--kw-ls-eyebrow` | `0.3em` | アイウェイブロウ字間（英語） |
| `--kw-ls-eyebrow-ja` | `0.05em` | アイウェイブロウ字間（日本語） |
| `--kw-ls-eyebrow-lg` | `0.4em` | 大アイウェイブロウ字間 |
| `--kw-ls-button` | `0.1em` | ボタン字間 |

### スペーシング・その他トークン（:root 固定）

| 変数名 | 値 | 変数名 | 値 |
|---|---|---|---|
| `--kw-space-1` | `4px` | `--kw-space-12` | `48px` |
| `--kw-space-2` | `8px` | `--kw-space-16` | `64px` |
| `--kw-space-3` | `12px` | `--kw-space-20` | `80px` |
| `--kw-space-4` | `16px` | `--kw-space-24` | `96px` |
| `--kw-space-5` | `20px` | `--kw-radius-none` | `0` |
| `--kw-space-6` | `24px` | `--kw-radius-xs` | `2px` |
| `--kw-space-8` | `32px` | `--kw-radius-sm` | `4px` |
| `--kw-space-10` | `40px` | `--kw-radius-md` | `6px` |
| — | — | `--kw-radius-lg` | `8px` |
| — | — | `--kw-radius-pill` | `9999px` |
| `--kw-rail-width` | `64px` | `--kw-content-max` | `1100px` |
| `--kw-prose-max` | `72ch` | `--kw-duration-fast` | `140ms` |
| `--kw-duration-normal` | `220ms` | `--kw-easing` | `cubic-bezier(0.4,0,0.2,1)` |

---

## 6. 3カラムグリッド・縦書きレール仕様

### 6.1 3カラムページレイアウト

`SiteLayout.astro` の `.kw-page` が全ページに適用する 3カラムグリッドです。

```
┌──────────┬──────────────────────────────────┬──────────┐
│  左レール  │           メインコンテンツ         │  右レール  │
│  64px    │     1fr（最大 1400px に制限）       │  64px    │
└──────────┴──────────────────────────────────┴──────────┘
```

| 属性 | 値 |
|---|---|
| グリッド定義 | `grid-template-columns: var(--kw-rail-width) 1fr var(--kw-rail-width)` |
| 最大幅 | `1400px`（`margin: 0 auto` で中央寄せ） |
| レール幅 | `64px`（`--kw-rail-width`） |
| コンテンツ最大幅 | `min(1100px, 100%)`（`--kw-content-max`、`site-main` 内部で適用） |
| コンテンツパディング（デスクトップ） | `64px (top) 32px (side) 80px (bottom)` |
| コンテンツパディング（モバイル ≤720px） | `32px (top) 16px (side) 48px (bottom)` |

### 6.2 縦書きレール

左右のレールは `<aside aria-hidden="true">` として実装し、装飾テキストを縦書きで表示します。

**クラス:**

| クラス | 役割 |
|---|---|
| `.kw-rail` | 左レール（右辺に `1px solid --kw-rule-soft`） |
| `.kw-rail--right` | 右レール（左辺に `1px solid --kw-rule-soft`） |
| `.kw-rail__text` | レール内テキスト（縦書き） |

**`.kw-rail__text` スタイル:**

| プロパティ | 値 |
|---|---|
| `writing-mode` | `vertical-rl` |
| `text-orientation` | `mixed` |
| `font-family` | `var(--kw-font-display)` |
| `font-size` | `var(--kw-fs-mono)` (13px) |
| `line-height` | `2.2` |
| `letter-spacing` | `0.15em` |
| `color` | `var(--kw-fg-faint)` |
| `user-select` | `none` |

**デフォルトテキスト（SiteLayout.astro）:**

| レール | デフォルト値 |
|---|---|
| 左 (`leftRail` prop) | `'二〇二六年五月十三日 — 横浜にて記す'` |
| 右 (`rightRail` prop) | `'Vol. XVIII · keroway portfolio'` |

### 6.3 ブレークポイント

| ブレークポイント | 変更内容 |
|---|---|
| `≤ 900px` | 3カラム → 1カラム（`.kw-rail` を `display: none`） |
| `≤ 720px` | `site-main` の padding を縮小 |
| `≤ 640px` | ヘッダーの padding 縮小・日付・ブランド名を非表示 |

---

## 7. コンポーネント用途と使い分け

### 7.1 Numbered Row（番号付き行リスト）

**実装場所:** `src/pages/index.astro`（最近の記録セクション）、`src/pages/about.astro`（キャリア年表）

**用途:** ブログ記事一覧・時系列リストなど、順序付きリンク行の表示に使用します。コンポーネントとして独立はしておらず、各ページ内にパターンとして実装されています。

**構造:**

```
.post-row / .timeline-row
  ├── [番号] .kw-numeral .kw-tabular  （砂金色の番号、22px、JetBrains Mono）
  ├── [本文]
  │    ├── メタ情報  .kw-eyebrow       （日付・カテゴリ）
  │    ├── タイトル  font-display h3   （--kw-fs-h3, --kw-fw-medium）
  │    └── 説明文   font-body-sm      （--kw-fg-muted）
  └── [矢印] →  font-display 20px     （--kw-fg-link）
```

**グリッド列:** デスクトップ `56px 1fr auto`、モバイル(≤640px) `40px 1fr auto`

**使い分け指針:**
- 記事一覧・ランキングなど「クリックできる順序付きリスト」には Numbered Row を使う。
- 単純な見出し行には SectionHead を使う。
- カードグリッドにする場合は FocusCard を使う。

---

### 7.2 FocusCard

**実装:** `src/components/FocusCard.astro`

**Props:**

| prop | 型 | 説明 |
|---|---|---|
| `index` | `number` | 0始まりの連番（`01/`, `02/` の表示番号を生成） |
| `key` | `string` | 識別キー（スネークケース、サムネイルのプレースホルダテキストにも使用） |
| `title` | `string` | 日本語タイトル |
| `description` | `string` | 説明文 |

**構造:**

```
article.focus-card
  ├── div.focus-card__thumb  （プレースホルダ画像、高さ 120px、border-radius md）
  ├── div.focus-card__eyebrow  kw-eyebrow
  │    ├── span.focus-card__num  kw-numeral  （01/ 形式、砂金色）
  │    └── span  （key テキスト）
  ├── h3.focus-card__title    （--kw-fs-h3, medium, navy）
  └── p.focus-card__desc      （--kw-fs-body-sm, muted, text-indent: 1em）
```

**使用箇所:** ホーム「専門分野」、About「得意分野」の 2〜4列グリッド表示。

**使い分け指針:**
- 専門領域・スキル・サービス紹介など「カテゴリのグループ展示」に使用。
- リンクを持たない静的な説明カード。リンクが必要な場合は別途カードコンポーネントを検討。
- サムネイルは現在プレースホルダ表示。実画像が必要な場合は `focus-card__thumb` を `<Image>` に置き換える。

---

### 7.3 SectionHead

**実装:** `src/components/SectionHead.astro`

**Props:**

| prop | 型 | 必須 | 説明 |
|---|---|---|---|
| `jp` | `string` | 必須 | 日本語セクションタイトル |
| `en` | `string` | 必須 | 英語ラベル（モノスペース・大文字） |
| `action` | `string` | 任意 | アクションリンクのラベル（例：`see all (12) →`） |
| `actionHref` | `string` | 任意 | アクションリンクの URL（デフォルト `'#'`） |
| `id` | `string` | 任意 | ARIA アンカー用 ID（`<h2>` 等の `aria-labelledby` と対応） |

**構造:**

```
div.kw-section-head
  └── div.kw-section-head__title
       ├── span.kw-section-head__jp    （--kw-fs-display-sm, medium, navy）
       ├── span.kw-section-head__divider  （砂金の 24px 横線）
       └── span.kw-section-head__en    （kw-eyebrow スタイル）
  └── [a].kw-section-head__en          （action がある場合のみ、--kw-fg-link 色）
```

**使い分け指針:**
- ページ内の各セクション（「最近の記録」「専門分野」等）の区切り見出しとして使用。
- `jp` + `en` の2言語ラベルが必須。英語ラベルは `kw-eyebrow` スタイルのモノスペース大文字。
- `action` を指定すると右端に「全件表示」リンクを追加できる。
- `id` を指定して `aria-labelledby` と組み合わせることで、セクションのアクセシビリティを担保する。

**狭幅での折り返し挙動（正式意匠、Issue #571 で採用決定）:**
- コンテナは `flex-wrap` を持ち、1行に収まらない幅では action リンクが2行目（左寄せ）に折り返る。これはバグではなく正式な挙動。
- 折り返し開始幅は内容依存。最長の「最近の記録 + `see all (N) →`」（トップページ）では約 590px 以下で折り返る＝現行のスマートフォン全機種が対象。320px 付近ではタイトル内部（jp / divider / en）も折り返す。
- `action` のラベル長は記事数（`see all (N)`）や A11y メニューの文字拡大で変動するため、1行維持を前提としたレイアウトにしないこと。

---

### 7.4 Monogram

**実装:** `src/components/Monogram.astro`

**Props:**

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| `caption` | `string` | `'/ keroway'` | K の隣に表示するテキスト |
| `tag` | `string` | `'Vol. XVIII · 二〇二六'` | 波紋の下のタグライン |

**構造:**

```
div.kw-monogram
  ├── div.kw-monogram__row
  │    ├── span.kw-monogram__k        （Shippori Mincho, 56px, medium, navy）
  │    └── span.kw-monogram__caption  （Shippori Mincho, 14px, blue, tracking 0.1em）
  ├── div.kw-wave  （CSS のみの海岸線/道筋モチーフ、aria-hidden）
  └── div.kw-monogram__tag            （JetBrains Mono, 10px, uppercase, faint）
```

**`.kw-wave` 仕様:** CSS `linear-gradient` と小さな点で海岸線/道筋を描く署名モチーフ。幅 148px・高さ 18px。`--kw-road` 色、opacity 0.58。

**使用箇所:** ホームヒーロー右端、About マストヘッド右端、フッター左下。

**使い分け指針:**
- ページの「署名」として機能するブランドアイデンティティ要素。
- ヒーロー右、フッター左等の「コーナー」に配置してページ全体に統一感を持たせる。
- `caption` と `tag` で文脈に応じた情報を表示（About ページでは `tag="Vol. XVIII · 著者紹介"` 等）。
- モバイルではヒーロー・マストヘッドの Monogram を `display: none` にして省スペース化する。

---

### 7.5 KSeal

**実装:** `src/components/KSeal.astro`

朱印アクセント用の装飾コンポーネントです。読み違いを避けるため、細部の既定文字は「録」ではなく「記」を使います。

**Props:**

| prop | 型 | デフォルト | 説明 |
|---|---|---|---|
| `label` | `string` | `'K'` | 中央に表示する署名文字 |
| `detail` | `string` | `'記'` | 右側の小さな補助文字。記録・手控えの意味を持たせる |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 印のサイズ。`sm` では detail を隠す |

**使い分け指針:**
- 朱印は小さな署名アクセントとして使い、本文や一覧の可読性に干渉させない。
- 印章らしさは朱色・軽い傾き・細い内枠に留め、かすれ・篆刻風文字・重い装飾は避ける。
- 多文字化すると古めかさが強くなるため、中央は `K`、補助文字は 1 字までにする。

---

## 8. フォント設定

### 8.1 Shippori Mincho

明朝体の和文フォント。Astro fonts API（`astro.config.mjs` の `fontProviders.fontsource()`）で自己ホスト配信します（→ [ADR 0013](./adr/0013-web-fonts-self-hosting.md)）。見出し（`--kw-font-display`）・縦書きレール・署名・朱印に使用し、本文は BIZ UDPGothic に分離します（→ [ADR 0012](./adr/0012-tokaido-field-notes-refresh.md)）。

**ロードウェイト（`astro.config.mjs` より）:** `500` のみ。下表の 400 / 600 / 700 はフォールバックフォントまたは合成ウェイトで描画されるため、新規要素は medium (500) を基準にする。

| ウェイト | トークン | 主な用途 |
|---|---|---|
| 400 (`--kw-fw-regular`) | 通常本文・補助テキスト |
| 500 (`--kw-fw-medium`) | 見出し全般・ボタン・SectionHead タイトル・Monogram の K |
| 600 (`--kw-fw-semibold`) | 強調（限定使用） |
| 700 (`--kw-fw-bold`) | `<strong>`, `<b>` 要素 |

**サイズ使用例:**

| 箇所 | サイズトークン | ウェイト |
|---|---|---|
| About マストヘッド見出し | `--kw-fs-display-xl` (96px) | medium |
| ホームヒーロー見出し | `--kw-fs-display-lg` (72px) | medium |
| SectionHead タイトル | `--kw-fs-display-sm` (32px) | medium |
| Monogram `K` | `56px` | medium |
| FocusCard タイトル / h3 | `--kw-fs-h3` (22px) | medium |
| 通常本文 | `--kw-fs-body` (16px) | BIZ UDPGothic regular |

**グローバル設定（`global.css`）:**

```css
html {
  font-family: var(--kw-font-body);
  font-size: var(--kw-fs-body);        /* 16px */
  line-height: var(--kw-lh-relaxed);  /* 1.85 */
  letter-spacing: var(--kw-ls-body);  /* 0 */
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--kw-font-display);
  font-weight: var(--kw-fw-medium);   /* 500 */
  letter-spacing: var(--kw-ls-display); /* -0.02em */
  line-height: var(--kw-lh-tight);    /* 1.05 */
}
```

---

### 8.2 BIZ UDPGothic

本文用のゴシック体。長文の読みやすさを優先し、通常本文・カード説明文・リード文に使用します。見出しや装飾は Shippori Mincho に残し、本文だけをゴシック化します。

**ロードウェイト（`astro.config.mjs` より）:** `400` / `700`（Astro fonts API で自己ホスト配信）。

### 8.3 JetBrains Mono

等幅フォント（`--kw-font-mono`）。Astro fonts API で自己ホスト配信します（→ [ADR 0013](./adr/0013-web-fonts-self-hosting.md)）。コード・ラベル・ナビゲーション・日付表示などの「機械的・情報的」要素に使用します。

**ロードウェイト（`astro.config.mjs` より）:** `400` / `500`（700 はロードせず限定使用に留める）。

| ウェイト | トークン | 主な用途 |
|---|---|---|
| 400 (`--kw-fw-regular`) | `kw-eyebrow`, コードブロック, ヘッダーナビ |
| 500 (`--kw-fw-medium`) | `kw-numeral`（番号）, ヘッダーブランド名 |
| 700 (`--kw-fw-bold`) | 限定使用 |

**サイズ使用例:**

| 箇所 | サイズ | ウェイト |
|---|---|---|
| `kw-numeral`（番号） | `22px` | medium |
| ヘッダーブランド名 | `--kw-fs-mono-sm` (12px) | medium |
| ヘッダーナビリンク | `--kw-fs-mono-sm` (12px) | regular |
| `kw-eyebrow`（アイウェイブロウ） | `--kw-fs-mono-xs` (10px) | regular |
| ステータスチップ | `--kw-fs-mono-xs` (10px) | regular |
| インラインコード | `0.92em`（親の92%） | regular |
| 縦書きレールテキスト | `--kw-fs-mono` (13px) | regular |

**特殊設定:**

```css
code, kbd, samp {
  font-feature-settings: "liga" 0, "calt" 0;  /* 合字・文脈依存代替を無効化 */
}
```

コードブロック内での意図しない合字を防ぐため、OpenType の `liga` および `calt` 機能を無効にしています。

---

## 9. モチーフ語彙

keroway.com の視覚言語は、横浜近郊を描いた浮世絵に着想したモチーフで構成します。当初は葛飾北斎「神奈川沖浪裏」の波（`.kw-wave`）一作に依拠していましたが、これを **「横浜近郊という地理的近接」** を統合軸として複数の図像へ拡張します（→ [ADR 0007](./adr/0007-motif-vocabulary-expansion.md)）。

### 9.1 統合軸と出典

モチーフの出典は単一の作者・シリーズに収まりません。**統合軸は「作者」ではなく「横浜近郊という地理的近接」** です。「すべて北斎」と表記しないこと。

| モチーフ | 画題 | 作者 | シリーズ | 図像化 |
|---|---|---|---|---|
| 波/海岸線 | 神奈川沖浪裏・横浜沿岸 | 葛飾北斎 / 地理的抽象 | 『富嶽三十六景』ほか | 実装済み（`.kw-wave`, `HeroBackdrop`） |
| 富士の遠景 | 東海道程ヶ谷 | 葛飾北斎 | 『富嶽三十六景』 | トークン定義済み（必要時に薄い背景として使用） |
| 松並木/道筋 | 東海道程ヶ谷 | 葛飾北斎 | 『富嶽三十六景』 | 実装済み（`.kw-divider-pine`） |
| 道筋（街道） | 戸塚・神奈川・程ヶ谷の街道 | 歌川広重 / 葛飾北斎 | 『東海道五十三次』『富嶽三十六景』 | 実装済み（`HeroBackdrop`） |
| 宿場の街道風景（参照） | 戸塚・神奈川 | 歌川広重 | 『東海道五十三次』 | 引用元として参照のみ |

程ヶ谷（保土ヶ谷）・戸塚・神奈川宿はいずれも東海道の横浜近郊の宿場、神奈川沖は横浜の海です。北斎『富嶽三十六景』と広重『東海道五十三次』という別絵師・別シリーズをまたぐ点に注意します。

### 9.2 共通の設計制約

全モチーフが従う制約です。実装（CSS/SVG）時に必ず守ります。

| 制約 | 内容 |
|---|---|
| 依存追加なし | CSS `gradient` / `clip-path` / インライン SVG のみで描く。`.kw-wave`（`radial-gradient` のみで波紋を描く先例）の路線を踏襲（→ [ADR 0001](./adr/0001-css-framework.md), [ADR 0007](./adr/0007-motif-vocabulary-expansion.md)） |
| 既存パレット非衝突 | 紺碧（`--kw-navy`）・白浪（`--kw-paper`）・砂金（`--kw-sand`）を基調にする。ADR 0012 以降は朱（`--kw-vermilion`）を 5% 以下の強アクセントとして許容する |
| ライト/ダーク両対応 | `[data-theme="dark"]` でも破綻しない。`currentColor` かセマンティックトークン経由で色を取る |
| 支援技術に非露出 | 装飾要素は `aria-hidden="true"`（`.kw-wave` と同じ扱い）。情報を持たない純粋な装飾 |
| モーション抑制 | モーションを足す場合は `@media (prefers-reduced-motion: reduce)` でオフにできる経路を用意（global.css の全称規則に乗せる） |

> **注:** トークンの実体化状況は以下のとおりです。命名は §4.2 の `--kw-{category}-{scale}` 規則に従います。
>
> - **§9.4 松並木 (`--kw-pine` / `--kw-pine-soft`)・§9.5 富士の遠景 (`--kw-fuji` / `--kw-fuji-faint`)**: `src/styles/tokens.css` にライト/ダーク両値で**定義済み**。
> - **§9.6 道筋 (`--kw-road` / `--kw-road-soft`)**: ADR 0012 により `src/styles/tokens.css` にライト/ダーク両値で**定義済み**。
> - **朱印 (`--kw-vermilion` / `--kw-vermilion-soft`)**: ADR 0012 により強アクセントとして**定義済み**。朱印・hover・小さな active 表現に限定する。

### 9.3 波（実装済み）

| 項目 | 内容 |
|---|---|
| 意味 | 「神奈川沖浪裏」の波頭。サイトのブランドシグネチャ・署名。動的なエネルギーと土地性（横浜の海）を象徴する |
| 用途指針 | ブランド署名（`Monogram`）のコーナー配置に限定。多用せず「署名」としての希少性を保つ。本文区切りには使わない |
| 想定トークン | 既存。`currentColor`（`--kw-road`）+ `opacity: 0.58`。専用色トークンは持たない |
| 実装 | `global.css` の `.kw-wave`（幅 148px・高さ 18px、短い水平線と点）。使用箇所はホームヒーロー右端・About マストヘッド右端・フッター左下（→ §7.4 Monogram） |

### 9.4 松並木

| 項目 | 内容 |
|---|---|
| 意味 | 「東海道程ヶ谷」の街道沿いの松並木。連なり・道・継続を象徴する。波の動に対する「静」の語彙 |
| 用途指針 | セクション間の区切り（ディバイダ）に使う。`SectionHead` の砂金ディバイダ（→ §7.3）とは役割を分け、ページ内の大きな区切りや記事末尾の締めに用いる。装飾密度を上げすぎない |
| トークン | `--kw-pine` / `--kw-pine-soft`（松 = 緑系、彩度を抑えた深緑〜苔色）を `src/styles/tokens.css` にライト/ダーク両値で**定義済み** |
| 装飾実装 | `global.css` の `.kw-divider-pine`。三角形の反復ではなく、薄い道筋ラインと小さな地点プロットで水平区切りを描く（高さ 18px）。色は `--kw-road-soft` + `--kw-pine`。ホーム HERO 直下のセクション区切りで使用 |

### 9.5 富士の遠景

| 項目 | 内容 |
|---|---|
| 意味 | 「東海道程ヶ谷」松並木越しに望む富士の遠景。背景・奥行き・静謐を象徴する。前景でなく「遠くにある」ことに意味がある |
| 用途指針 | 大きな余白・ヒーロー背景・記事末尾などの「空白を語る」場面で、ごく薄いウォーターマークとして使う。前景のテキストやカードの可読性を損なわないこと。1 画面に 1 つまでを目安にする |
| トークン | `--kw-fuji` / `--kw-fuji-faint`（富士の遠景 = 霞んだ青/藍系、`--kw-navy` より明度高め・彩度低め）を `src/styles/tokens.css` にライト/ダーク両値で**定義済み** |
| 装飾実装 | ADR 0012 以降のホーム HERO では、富士シルエットを直接置かず、`HeroBackdrop.astro` の低い海岸線/水面レイヤーに置き換える。富士トークンは記事末尾などの余白装飾に利用できる |

### 9.6 道筋（街道）

東海道の街道そのものを表す語彙です（→ [ADR 0011](./adr/0011-motif-road-path.md), [ADR 0012](./adr/0012-tokaido-field-notes-refresh.md)）。波・松並木・富士の遠景と同じ「横浜近郊という地理的近接」の軸に属し、既存の地理的物語に街道という連結線を一本引く位置づけです。ADR 0012 以降は `--kw-road` / `--kw-road-soft` を使い、HERO の主装飾としてやや強く扱います。

| 項目 | 内容 |
|---|---|
| 意味 | 程ヶ谷・戸塚・神奈川宿を結ぶ東海道の道筋。移動・記録・中継点を象徴する。「旅人が宿場を通過しながら記録を残す」というサイトコンセプト（横浜で技術の手控えを残す）に直結する語彙 |
| 用途指針 | HERO 背景で海岸線に重ね、画面を斜めに抜ける一本の道として敷く。文字では説明せず、無記名の地点プロットで宿場町の気配を出す。前景テキスト・カードの可読性を損なわないよう、ごく薄いウォーターマークとして扱う。1 画面に 1 本まで。本文区切りには使わない |
| トークン | `--kw-road` / `--kw-road-soft` を `src/styles/tokens.css` にライト/ダーク両値で定義済み。地点（宿場）は `--kw-sand` を薄く使い、朱は使わない |
| 装飾実装（`HeroBackdrop`） | `src/components/HeroBackdrop.astro` が海岸線・道筋・地点・水面を 1 枚のインライン SVG（`viewBox="0 0 1200 700"`、`preserveAspectRatio="none"`）に統合する。道筋は薄い太線 (`--kw-road-soft`) と細い破線 (`--kw-road`) を重ねる。地名ラベルは置かない。全体 `aria-hidden`・静止（モーションなし）・`position: absolute; inset: 0` で CLS なし。モバイルでは水面を隠して簡略化する |

---

## 補足: テーマ切り替え

ダークモードは `[data-theme="dark"]` 属性セレクタで切り替えます（`prefers-color-scheme` メディアクエリは使用しません）。UnoCSS の `dark:` バリアントも同一セレクタに対応しています。

```css
/* uno.config.ts */
dark: { dark: '[data-theme="dark"]' }
```

`color-scheme` プロパティも各テーマで宣言しており、ブラウザのネイティブ UI（スクロールバー・フォームコントロール等）にもテーマが反映されます。
