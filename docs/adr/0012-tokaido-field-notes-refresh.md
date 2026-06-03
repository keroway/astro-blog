# 0012 — Tokaido Field Notes の視覚刷新

- **ステータス**: Accepted
- **決定日**: 2026-06-03
- **決定者**: @keroway
- **前提資料**: [desgin-advise.md](../../desgin-advise.md), [ADR 0007](./0007-motif-vocabulary-expansion.md), [ADR 0011](./0011-motif-road-path.md), [docs/design-system.md](../design-system.md)

---

## コンテキスト

ホーム HERO には ADR 0011 に基づく道筋モチーフが実装済みだが、表現はごく薄いウォーターマークに留まっている。`desgin-advise.md` が指摘する「東海道・戸塚・横浜・技術手控え」を視覚言語として強めるには、背景だけでなくタイポグラフィ、カード、署名アクセントまで一体で更新する必要がある。

一方で ADR 0011 は、道筋追加時の安全な最小変更として「新色なし」「朱アクセント非採用」を固定している。これは当時のスコープ管理としては妥当だが、今回の「より大胆に変更する」目的には制約が強すぎる。

## 決定事項

**Tokaido Field Notes from Yokohama** をホーム刷新のコンセプトとして採用する。ADR 0011 の道筋語彙は維持しつつ、次の点を更新する。

1. **朱アクセントを採用する**: `--kw-vermilion` / `--kw-vermilion-soft` を追加し、朱印・hover underline・小さな状態アクセントに限定して使う。面積は画面全体の 5% 以下を目安とする。
2. **本文フォントをゴシックへ移す**: 長文の読みやすさを優先し、`--kw-font-body` は BIZ UDPGothic 系にする。見出し・縦書き・署名は Shippori Mincho を継続する。
3. **道筋を主装飾へ引き上げる**: `--kw-road` / `--kw-road-soft` を追加し、HERO の道筋・地点・水面・地名ラベルを背景の主役に近い扱いへ強める。ただし装飾は `aria-hidden` のまま情報を持たせない。
4. **Home の視覚密度を上げる**: Recent Posts の先頭記事を大きな field note カードにし、Works / Focus には抽象モチーフパネルを持たせる。コンテンツスキーマは変更しない。

## 影響

- `src/styles/tokens.css`: 朱・道筋・本文フォント・影トークンを更新する。
- `src/components`: 朱印、モチーフパネル、Recent note のコンポーネントを追加する。
- `src/pages/index.astro`: HERO と Home セクションの構成を更新する。
- `docs/design-system.md`: ADR 0012 の判断をデザインシステムに反映する。

## 制約

- 新しい UI / CSS ライブラリは追加しない。Astro + UnoCSS + scoped CSS の範囲で実装する。
- 主要導線、見出し、本文のコントラストを落とさない。
- モーションは既存の `prefers-reduced-motion` 経路に乗せる。
- Blog 記事本文と Works 個別ページの全面再設計はこの ADR の範囲外とする。

## 結果

既存の Kanagawa デザインシステムを捨てずに、東海道の道筋・朱印・紙面・技術手控えの語彙を前面へ出せる。ADR 0011 の保守的な判断は「道筋追加時の最小変更」として残し、今回の視覚刷新では ADR 0012 が優先される。
