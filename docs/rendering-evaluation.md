# レンダリング戦略評価レポート

- **作成日**: 2026-05-16
- **対象 Issue**: [#61 SSG vs SSR vs ISR の評価レポートを作成](https://github.com/keroway/astro-blog/issues/61)
- **親 Issue**: [#15 Vercel Adapter / SSR 化の評価](https://github.com/keroway/astro-blog/issues/15)
- **後続**: [#63 ADR 起票: docs/adr/0003-rendering-strategy.md](https://github.com/keroway/astro-blog/issues/63)

---

## 1. 現状の SSG 構成と制約

### 現状

| 項目 | 状態 |
|------|------|
| フレームワーク | Astro 6（SSG モード、adapter なし） |
| ホスティング | Vercel（静的サイト配信） |
| ビルドコマンド | `corepack pnpm run build` (`astro check && astro build`) |
| 記事数 | 52 記事（全 Markdown、Content Collections） |
| 動的コンテンツ | なし（全ページ静的生成） |

### SSG の制約

| 制約 | 影響 |
|------|------|
| コンテンツ更新には再ビルドが必要 | 記事公開・修正のたびに Vercel デプロイが走る |
| ランタイム API ルートが使えない | エッジ関数が必要な処理（OGP 動的生成、フォーム送信等）を標準の Astro SSG では扱えない |
| プレビュー機能の実装難度が高い | ドラフト記事のプレビューには別ブランチのビルドが必要 |
| ISR（増分再生成）は利用不可 | Vercel の On-Demand ISR を使うには `@astrojs/vercel` adapter が必要 |

---

## 2. 関連 Issue の要件整理

### 前提条件

Issue #61 の技術メモに「#29 の CMS 選定結果によって推奨方針が変わりうるため、前提条件を明記する」と記載されている。

**本レポートの前提: Keystatic を CMS として採用（ADR 0002 Proposed 状態）**

Keystatic は Git-based CMS であり、編集は Git コミット経由でリポジトリに書き込まれる。そのため SSG との親和性が高い。

---

### #29 / ADR 0002: CMS 選定（Keystatic）

| 評価軸 | SSG への影響 |
|--------|------------|
| Keystatic の編集機能 | ローカル開発時は `astro dev`（SSG/SSR 両対応）、本番は Git コミット → Vercel 自動デプロイ |
| Keystatic branch mode | ブランチ切り替えで Vercel Preview Deployment を生成。SSG でも実現可 |
| Keystatic Cloud（オプション） | Next.js または互換アダプターが必要。Astro SSG では利用不可。ただし本プロジェクトでは Keystatic Cloud 採用予定なし（ADR 0002 より） |
| **結論** | **Keystatic は SSG と完全に相互運用可能** |

---

### #25: OGP 動的生成（satori / @vercel/og）

| 実装方式 | 必要なレンダリング | 難易度 | 備考 |
|----------|-----------------|--------|------|
| **satori でビルド時全生成** | SSG | ★★☆ | 52 記事分の PNG をビルド時に生成。ビルド時間増加だが実装がシンプル |
| **@vercel/og (Edge Function)** | SSR / Edge | ★★★ | `@astrojs/vercel` adapter + Edge Runtime が必要。on-demand 生成でビルド時間不変 |
| **外部 OGP サービス** | SSG | ★☆☆ | Cloudinary / OG Image Generator 等の外部 API を利用。依存が増える |

**日本語フォント埋め込みの考慮**:
- satori は `@vercel/og` の基盤ライブラリであり、`fetch` + ArrayBuffer 形式でフォントを渡す
- ビルド時生成（SSG）でも on-demand（SSR）でも satori 自体は利用可能
- Zen Maru Gothic の woff2 サブセットをビルドスクリプトで参照する形が最もシンプル

---

### #34: プレビュー機能とデプロイフロー

| フロー | SSG での実現性 |
|--------|-------------|
| Keystatic branch mode → Vercel Preview | ✅ ブランチデプロイで実現可。SSR 不要 |
| ドラフト記事の本番プレビュー | ✅ `draft: true` フィルタをブランチで外した preview 環境を構築 |
| 公開予約（#101） | △ ビルドフック（Vercel Deploy Hook + cron）で実現可能。SSR は不要だが運用が複雑になる |

---

## 3. SSG / SSR / ISR の比較表

| 評価軸 | SSG（現状継続） | SSR（`@astrojs/vercel` adapter） | ISR（Vercel On-Demand） |
|--------|--------------|--------------------------------|------------------------|
| **コンテンツ鮮度** | ビルド時確定 | リクエスト時生成 | キャッシュ + 無効化 |
| **ページロード速度** | ★★★ CDN 配信 | ★★☆ サーバー処理あり | ★★☆ 初回はキャッシュミス |
| **Keystatic 互換** | ✅ | ✅ | ✅ |
| **OGP 動的生成** | △ ビルド時生成で代替可 | ✅ on-demand | ✅ on-demand |
| **プレビュー機能** | ✅ branch deploy | ✅ | ✅ |
| **Vercel adapter 要否** | 不要 | 必要 | 必要 |
| **Cold start リスク** | なし | あり（Edge Runtime で軽減） | あり（再検証時） |
| **実装コスト** | ★☆☆ 変更なし | ★★★ adapter 導入・設定変更 | ★★★ + キャッシュ管理 |
| **個人ブログ規模での実用性** | ✅ 十分 | ○ Over-engineering のリスク | ○ Over-engineering のリスク |
| **Phase 3（自作管理画面）への移行** | 要移行作業 | そのまま拡張可 | そのまま拡張可 |

---

## 4. 推奨方針

### 推奨: **SSG 継続（Phase 2 まで）**

以下の根拠から、現時点では SSG を継続し、SSR adapter 導入は行わないことを推奨する。

**根拠 1 — Keystatic が SSG で完全動作する**
- ADR 0002 で採用決定した Keystatic（Git-based CMS）は、編集 → Git コミット → Vercel ビルドの流れで完全に SSG と親和する。SSR は必要ない。

**根拠 2 — OGP は SSG でビルド時生成で代替可能**
- satori を使ったビルド時 OGP 画像生成は技術的に実現可能（Issue #82/#83 で詳細検討予定）。52 記事程度のビルド時間増加は許容範囲内。

**根拠 3 — SSR 追加コストが現スケールに見合わない**
- 個人ブログ規模では SSR の cold start・adapter 依存・設定複雑性が費用対効果を下げる。Vercel の無料プランで SSR は制約が生じる可能性がある。

**根拠 4 — Phase 3 までの段階移行が現実的**
- ADR 0002 のロードマップ通り、Phase 3（Cloudflare Workers + D1 + R2 + 自作管理画面）で SSR に完全移行する方が理にかなっている。Phase 2 で中途半端な SSR 化をするより SSG を維持した方がリスクが低い。

### SSR 移行を再検討すべきトリガー

以下の条件が発生した場合は SSR 化を再評価する:

1. OGP 動的生成でビルド時生成の制約（フォント、生成時間）が致命的になった場合
2. Keystatic Cloud への移行が必要になった場合（Keystatic Cloud は SSR adapter が必要）
3. リアルタイムコンテンツやフォーム機能が必要になった場合

---

## 5. 後続アクション

| アクション | Issue | 優先度 |
|-----------|-------|--------|
| 本レポートを元に ADR 0003 を起票 | #63 | M1 |
| OGP 生成ライブラリの比較（satori vs @vercel/og）| #82 | M3 |
| Keystatic PoC 実施 | #86 | M5 |
| 公開予約のビルドフック設計（SSG 前提） | #101 | M5 |
