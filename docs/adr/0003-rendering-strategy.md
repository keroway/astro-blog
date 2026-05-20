# 0003 — レンダリング戦略: SSG 継続

- **ステータス**: Superseded by [ADR 0005](./0005-keystatic-admin-runtime.md)
- **決定日**: 2026-05-16
- **置換日**: 2026-05-21
- **決定者**: @keroway
- **関連 Issue**: [#63 ADR 起票](https://github.com/keroway/astro-blog/issues/63), [#15 Vercel Adapter / SSR 化の評価](https://github.com/keroway/astro-blog/issues/15), [#61 SSG vs SSR vs ISR 評価レポート](https://github.com/keroway/astro-blog/issues/61)
- **関連 Issue（影響先）**: [#25 OGP 動的生成](https://github.com/keroway/astro-blog/issues/25), [#34 プレビュー / デプロイフロー](https://github.com/keroway/astro-blog/issues/34), [#101 ビルドフック / 公開予約](https://github.com/keroway/astro-blog/issues/101)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)
- **入力資料**: [`docs/rendering-evaluation.md`](../rendering-evaluation.md)

---

## コンテキスト

keroway.com は Astro 6 で構築された個人ポートフォリオ兼テクニカルブログです。M1 マイルストーン「アーキテクチャ刷新」では、Vercel SSG の継続か、SSR / ISR への移行かを決定する必要があります。

### 現状

| 項目 | 状態 |
|------|------|
| フレームワーク | Astro 6（SSG モード、`astro.config.mjs` に adapter 設定なし） |
| ホスティング | Vercel（静的サイト配信） |
| ビルドコマンド | `corepack pnpm run build`（`astro check && astro build`、`vercel.json` 参照） |
| 記事数 | 52 記事（全 Markdown、Content Collections） |
| 動的コンテンツ | なし（全ページ静的生成） |

### SSG 継続 / 移行の判断要因

ADR 0002 で Keystatic を採用したことで、CMS 編集 → Git コミット → Vercel ビルドの SSG フローが前提として固まりました。一方で以下の追加要件があり、レンダリング戦略の選択肢を比較する必要があります。

1. **OGP 動的生成（#25）**: satori / @vercel/og によるカード画像生成
2. **プレビュー機能（#34）**: Keystatic branch mode + Vercel Preview Deployment
3. **公開予約（#101）**: ビルドフックでの定時デプロイ

評価レポート [`docs/rendering-evaluation.md`](../rendering-evaluation.md) で SSG / SSR / ISR の 3 戦略を比較済みです。本 ADR はその推奨方針を決定として確定します。

---

## 決定事項

**SSG（静的サイト生成）を継続する。** Vercel adapter の導入は行わない。

採用構成:

- **レンダリング**: Astro 6 標準の SSG モード（`astro build` で `dist/` を静的出力）
- **ホスティング**: Vercel の静的サイト配信（`vercel.json` の `buildCommand: "corepack pnpm run build"` を継続）
- **CMS との接続**: Keystatic（ADR 0002）の Git ベース編集 → Vercel 自動ビルド
- **OGP 動的生成**: ビルド時 satori で全記事分の PNG を生成（Issue #82 / #83 で詳細設計）
- **プレビュー**: Keystatic branch mode + Vercel Preview Deployment（Issue #100 で実機検証）
- **公開予約**: Vercel Deploy Hook + 外部 cron（Issue #101 で設計）

---

## 評価候補と比較

詳細は [`docs/rendering-evaluation.md`](../rendering-evaluation.md) を参照。要点を以下に再掲します。

| 評価軸 | SSG（採用） | SSR（`@astrojs/vercel` adapter） | ISR（Vercel On-Demand） |
|--------|------------|---------------------------------|------------------------|
| コンテンツ鮮度 | ビルド時確定 | リクエスト時生成 | キャッシュ + 無効化 |
| ページロード速度 | ★★★ CDN 配信 | ★★☆ サーバー処理 | ★★☆ 初回キャッシュミス |
| Keystatic 互換 | ✅ | ✅ | ✅ |
| OGP 動的生成 | △（ビルド時生成で代替） | ✅ on-demand | ✅ on-demand |
| プレビュー機能 | ✅ branch deploy | ✅ | ✅ |
| Vercel adapter 要否 | 不要 | 必要 | 必要 |
| Cold start | なし | あり（Edge で軽減） | あり（再検証時） |
| 実装コスト | ★☆☆ 変更なし | ★★★ adapter 導入・設定変更 | ★★★ + キャッシュ管理 |
| 個人ブログ規模での実用性 | ✅ 十分 | ○ Over-engineering | ○ Over-engineering |

---

## 採用理由（Why SSG）

1. **Keystatic が SSG で完全動作する**: ADR 0002 で採用決定した Keystatic（Git-based CMS）は編集 → Git コミット → Vercel ビルドのフローで動作するため、SSR は不要。Keystatic Cloud を採用しない方針も ADR 0002 で確定済み。
2. **OGP はビルド時生成で代替可能**: satori によるビルド時 OGP 画像生成は技術的に確立しており、52 記事程度ではビルド時間の増加も許容範囲。Issue #82 / #83 で satori vs @vercel/og の比較を行うが、SSR adapter の導入を前提にしない選択肢を保持する。
3. **SSR の追加コストが現スケールに見合わない**: 個人ブログ規模では SSR の cold start・adapter 依存・設定複雑性が費用対効果を下げる。Vercel 無料プランの Function 実行回数制限・実行時間制限を意識する必要も生じる。
4. **段階導入が可能**: ADR 0002 のロードマップ通り、Phase 3（Cloudflare Workers + D1 + R2 + 自作管理画面）で SSR に完全移行する道は閉ざさない。Phase 2 で中途半端な SSR 化をするよりも、SSG を維持して Phase 3 の本格的なアーキテクチャ刷新に投資する方がリスクが低い。
5. **ビルド時のスキーマ検証が活きる**: `astro check && astro build` でビルド時に Content Collections のスキーマ違反を検出する現運用が、Issue 投入のたびに型整合をチェックする安全弁として機能している。SSR 化するとこの検証タイミングが分散する。

---

## 却下した候補

### SSR（`@astrojs/vercel` adapter, `output: 'server'`）

**却下理由**:

1. **必須要件に対して過剰**: 現時点で動的レスポンスを必要とする機能（フォーム送信、認証、リアルタイム表示）は存在しない。OGP 生成・プレビュー・公開予約は全て SSG + ビルドフックで実現可能。
2. **Vercel adapter 依存の固定化**: `@astrojs/vercel` 導入後はホスティングプロバイダ移行（Issue #15 / ADR 0002 Phase 3 で想定する Cloudflare 移行）の手戻りが大きくなる。SSG のまま静的ファイル出力を維持する方が移植性が高い。
3. **Cold start とコスト**: Edge Runtime でも cold start は皆無ではなく、Vercel 無料プランの Function 実行回数・実行時間に制約が生じる。1 日 PV が低い個人ブログでもキャッシュミス時の体感劣化はある。
4. **AI 補助執筆との関係**: 記事正本は Git 上の Markdown のまま保つ方針（ADR 0002）と、SSR 導入は直接矛盾しないが、SSR を入れる積極的な理由が薄い。

### ISR（Vercel On-Demand Incremental Static Regeneration）

**却下理由**:

1. **adapter 必須**: ISR を使うには `@astrojs/vercel` adapter が必要で、SSR 却下理由 2 と同じくプロバイダ固定化の弊害がある。
2. **キャッシュ管理の複雑性**: 再検証トリガーの設計（記事更新・タグ変更時の再生成範囲）が必要で、52 記事規模では full rebuild の方がシンプル。
3. **更新頻度が低い**: 個人ブログの更新頻度（週 1〜数本程度）では、毎回 full rebuild してもビルド時間は許容範囲内。

### Hybrid（一部ページのみ SSR）

**却下理由**:

1. **対象ページが現状存在しない**: 「動的にしたいページ」が明確になっていない段階で hybrid を入れると、設計上のグレーゾーンが増える。
2. **将来必要になったら導入可**: Astro は `output: 'static'` のままページ単位で `prerender = false` を切り替える Hybrid モードへの移行コストが小さい。本 ADR の決定後に必要が生じた場合、別 ADR で追加するか本 ADR を Superseded にする運用とする。

---

## 関連 Issue への影響

### #15 親 Issue（Vercel Adapter / SSR 化の評価）

- **方針**: 本 ADR をもって「Phase 2 では SSR 化しない」と確定。親 Issue #15 のスコープは Phase 3（Cloudflare 移行 / 自作 admin）の評価に移行する。
- **adapter 導入の派生 Issue**: 本 ADR の決定では `@astrojs/vercel` adapter の導入は **不要** と判断するため、派生 Issue は起票しない。将来 SSR / ISR が必要になった場合は、本 ADR を Superseded にした上で新規 Issue を起票する運用とする。

### #25 / #82 / #83 OGP 動的生成

- **方針**: ビルド時 satori 生成を第一候補とする。
- **影響**: Issue #82（satori vs @vercel/og の比較）では「SSR adapter 不要の satori ビルド時生成」を本命として評価する。@vercel/og は SSR を要するため、本 ADR の方針下では却下候補。
- **代替案**: 外部 OGP サービス（Cloudinary / 既製 SaaS）を SSG のまま使う選択肢は残す。

### #34 / #99 / #100 プレビュー / デプロイフロー

- **方針**: Keystatic branch mode + Vercel Preview Deployment で実装。
- **影響**: SSR 不要のため、Issue #100（Vercel Preview と CMS の連携検証）は標準の Vercel 静的プレビューを前提に設計してよい。

### #101 ビルドフック / 公開予約

- **方針**: Vercel Deploy Hook を外部 cron（GitHub Actions scheduled workflow など）から呼び出す方式を採用。
- **影響**: SSR / ISR を使えば「公開日時を過ぎたら自動再生成」を on-demand で実現できるが、SSG では「定時に再ビルドを起こす」アプローチを取る。Issue #101 の設計は cron + Deploy Hook 前提で進める。

### ADR 0002 / Keystatic

- **整合性**: ADR 0002 は「Vercel SSG の継続を前提」と明記しており、本 ADR と完全に整合する。
- **影響なし**: Keystatic 自体は静的サイト出力に影響を与えず、`/keystatic` 管理画面はローカル開発時のみ動作する。

---

## `vercel.json` / `astro.config.mjs` との整合性確認

| ファイル | 現在の設定 | 本 ADR の決定との整合 |
|---------|-----------|---------------------|
| `vercel.json` | `installCommand: "corepack pnpm install --frozen-lockfile"` / `buildCommand: "corepack pnpm run build"` | ✅ SSG 出力（`dist/`）を Vercel が静的配信する前提と一致。変更不要。 |
| `astro.config.mjs` | `adapter` 設定なし、`output` 未指定（= `static`） | ✅ SSG モードで動作。変更不要。 |
| `package.json` の `build` スクリプト | `astro check && astro build` | ✅ ビルド時の型・スキーマ検証を維持。変更不要。 |

本 ADR の採用に伴う設定変更は **発生しない**。既存のビルド・デプロイパイプラインをそのまま継続する。

---

## SSR / ISR 移行を再検討すべきトリガー

以下の条件が発生した場合は本 ADR を **Superseded** にした上で再評価する:

1. **OGP 動的生成でビルド時生成の制約が致命的になった場合**: 日本語フォントのサブセット作成・生成時間がビルドのボトルネックになった場合
2. **Keystatic Cloud への移行が必要になった場合**: Keystatic Cloud は SSR adapter 前提で動作する
3. **リアルタイムコンテンツやフォーム機能が必要になった場合**: ニュースレター登録、コメント、検索 API など
4. **記事数が増大しビルド時間が許容範囲を超えた場合**: 数百〜千記事規模でビルド時間が課題になったとき
5. **ADR 0002 Phase 3 への移行に着手するとき**: Cloudflare Workers + D1 + R2 + 自作 admin のフルスタック移行のタイミングで、SSR を含むレンダリング戦略全体を再設計する

---

## 結果

SSG を継続することで以下が実現できます:

- 既存の Vercel SSG 構成・`vercel.json` / `astro.config.mjs` を変更せずに ADR 0002（Keystatic）を受け入れられる
- adapter 依存を増やさず、Phase 3 でのホスティング移行（Vercel → Cloudflare 等）の選択肢を保持できる
- ビルド時のスキーマ検証（`astro check`）が安全弁として継続的に機能する
- OGP・プレビュー・公開予約の各機能は SSG + ビルドフックで実現可能（後続 Issue #25 / #34 / #101 で詳細化）
- Phase 3 で SSR / ISR が必要になった場合は本 ADR を Superseded にして再評価する余地を残せる

---

## レビュー / 昇格手順

1. 本 ADR は **Status = Proposed** で起票
2. PR レビューでの合意後、`Accepted` へ昇格させる PR を別途出す
3. Accepted 後、Issue #82 / #100 / #101 を本 ADR の方針下で着手
