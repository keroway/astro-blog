<!-- markdownlint-disable MD013 MD060 -->

# Plan 012: 小粒 UI 改善スイープ（/now 導線・ヘッダー狭幅・共有 URL ほか）

> **Executor instructions**: 各項目は独立。上から順に、1 項目 1 コミットで進める。On any STOP condition, stop and report. When done, update `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f7f0e9d..HEAD -- src/components/Header.astro src/components/Footer.astro src/components/PostShare.astro "src/pages/blog/[...page].astro"`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 007（Header/blog 一覧を触るため、コンフリクト回避で後に実行）
- **Category**: UX polish
- **Planned at**: commit `f7f0e9d`, 2026-07-18

## Items

### 12-1: /now ページへの恒常導線を追加する

`/now` は現在 CommandPalette とスタンプラリー経由でしか到達できない（`rg '"/now"' src` で Footer/Header にヒットなし）。せっかくの /now ページ（最終更新日付き）が実質隠しページになっている。

- `Footer.astro` のリンク列（colophon と同格の場所）に `/now` を追加する。about ページ本文からのテキストリンクも検討。
- ヘッダーナビには**追加しない**（4 項目 + 番号のリズムを維持）。

### 12-2: 480px 以下のヘッダーの詰まりを解消する

480px 以下ではブランドが非表示になり、ナビ 4 項目と 3 つのアクションボタン（検索・a11y・テーマ）が同じ行で窮屈になる。実測スクリーンショットでは検索ボタン「⌕」が「ABOUT」に密着して 1 語のように見える。

- `Header.astro` の ≤480px スタイルで、ナビとアクションの間の視覚分離を確保する（`kw-header__actions` に `margin-inline-start: auto` / 境界線、またはアクションボタンの min-width を 40px に落として gap を確保、など小さい手当てで良い）。
- 44×44px のタップターゲットは維持する（WCAG 2.5.8 は 24px が下限だが現状の 44px を後退させない）。

### 12-3: 共有まわりの X 表記整合

- `PostShare.astro` の共有 intent が `https://twitter.com/intent/tweet` のまま。UI ラベルは「X で共有」。`https://x.com/intent/post` へ更新する。
- `Footer.astro` の外部リンクはラベル・URL とも `twitter.com/keroway21`。実プロフィール URL の方針（x.com へ変えるか）を操作者に確認の上で統一する（リダイレクトはされるため機能問題はない。表記の一貫性のみ）。

### 12-4: ブログ一覧の content-visibility プレースホルダ精度

`[...page].astro` の `.posts-list :global(.post-row) { contain-intrinsic-size: auto 180px; }` は実際の行高（説明文 2〜3 行で約 140–220px、モバイルはより高い）とズレるとスクロールバーが跳ねる。実測の中央値に合わせて更新するか、`contain-intrinsic-size: auto none` 相当の代替を検討する。効果が測定できなければ「現状維持」で README に記録して閉じてよい。

## Scope

**In scope**: `Footer.astro`, `Header.astro`, `PostShare.astro`, `src/pages/blog/[...page].astro`, `src/pages/about.astro`（12-1 のリンク追加時のみ）。

**Out of scope**: ナビ構造の再設計、ハンバーガーメニュー導入、SNS アカウント自体の変更。

## Done criteria

- [ ] `/now` へフッターから到達できる。
- [ ] 390px / 320px 幅でヘッダーの要素が重なり・密着なく表示される（スクリーンショット添付）。
- [ ] X 共有 intent が `x.com` になっており、共有が機能する。
- [ ] 12-4 の判断（変更 or 現状維持）が README 行に一行で記録されている。
- [ ] `pnpm run build` / `pnpm run lint` / `pnpm run lint:alt` exit 0。既存 Playwright スモークが pass。
- [ ] `plans/README.md` の Plan 012 行を更新。

## STOP conditions

- 12-2 が小手当てで収まらず、ナビ構造の変更（メニュー化）が必要になった場合 → 別 plan として起票し直す。
- 12-3 でフッターのプロフィール URL 方針について操作者の回答が得られない場合は intent のみ変更して残りをスキップ。
