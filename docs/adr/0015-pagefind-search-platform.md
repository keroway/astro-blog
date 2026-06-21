# 0015 — 全文検索基盤に Pagefind を採用する

- **ステータス**: Proposed
- **決定日**: 2026-06-21
- **決定者**: @keroway
- **関連 Issue**: [#280 Pagefind による全文検索を導入する](https://github.com/keroway/astro-blog/issues/280) / [#339 ADR: 検索基盤の選定判断を記録する](https://github.com/keroway/astro-blog/issues/339)
- **関連 PR**: 後続の #340 (インデックス生成) / #341 (検索 UI) で参照する

> **採番に関する注記**: 本 ADR は #339 で当初 `0014` として起票されたが、`0014` は先行する
> [Keystatic Google Fonts 除去](./0014-keystatic-google-fonts-removal.md) (#342) が確定済みのため、
> 採番衝突を避けて `0015` に繰り下げた。

---

## コンテキスト

ブログ記事が 52 本に達したが、検索手段はカテゴリ・年のクライアントサイドフィルタ (`initFilter()`) のみで、本文・タイトルのキーワード検索ができない。読者の記事到達性を上げるため `/blog` に日本語キーワード全文検索を追加したい。

確定済みの制約:

- レンダリング戦略は SSG (`output: "static"`, [ADR 0003](./0003-rendering-strategy.md) → [0005](./0005-keystatic-admin-runtime.md))。常時稼働のサーバ / 外部検索 API を新規に増やしたくない。
- デプロイは Vercel。CI の `build` ジョブ (`astro build` 直叩き) と Vercel (`corepack pnpm run build`) の **両ビルド経路**で同じ成果物が出る必要がある。
- 新規 CSS フレームワークの追加は禁止 ([ADR 0001](./0001-css-framework.md) の D1)。検索 UI は既存の `--kw-*` デザイントークンに準拠させる。
- `pnpm-workspace.yaml` の `minimumReleaseAgeStrict: true` により公開直後のバージョンは拒否される (バージョン pin が必要)。
- 本文は日本語 (CJK)。分かち書きを持たない言語の検索品質が選定上の重要論点。

流動的な点:

- 将来の記事数増加に伴うインデックスサイズ。
- 日本語検索品質への要求水準 (現状は「タイトル・本文がキーワードでヒットする」で十分)。

---

## 決定事項

**ビルド後処理として静的全文検索インデックスを生成する Pagefind を採用する。** Astro 統合 (`astro-pagefind`) または Pagefind CLI を `astro build` の後段に挟み、`dist/pagefind/` に出力された静的バンドルを検索 UI から読み込む。

*Rationale:* Pagefind は SSG が生成した HTML をビルド後にクロールして静的インデックスを生成し、ランタイムサーバを一切必要としない。インデックスはチャンク分割され、ブラウザは検索語に必要な部分だけを WebAssembly + Web Worker で取得するため、サイト規模が増えても初期ロードが膨らまない。SSG (`output: "static"`) という既存制約と最も整合し、サーバ運用コスト・SaaS 課金・ベンダーロックインのいずれも発生しない。v1.5.0 で CJK の自動セグメンテーション・relevance 改善・インデックス縮小・Web Worker 検索が入っており、日本語ブログの要求水準 (タイトル・本文のキーワードヒット) を満たす。

---

## 却下した候補

### 候補 A: Algolia / Meilisearch / Typesense (ホスト型・サーバ型検索)

**却下理由:** 検索品質・タイポ耐性・ファセットは優れるが、常時稼働サーバ (self-host) または SaaS 課金 (Algolia) を要し、SSG + Vercel という「ランタイム依存ゼロ」の現構成に対しオペレーションコストとベンダー依存が過剰。個人ブログ 52 記事の要求に対し釣り合わない。プライバシー面でも検索クエリを外部に送らない静的方式が望ましい。

### 候補 B: Fuse.js / Lunr.js / Orama などクライアント側全文検索

**却下理由:** ランタイム依存はない点で Pagefind と同じだが、インデックス全体を初回にブラウザへダウンロードしてメモリ上で検索する方式が主流で、記事数の増加に対してダウンロードサイズが線形に膨らむ。Pagefind のチャンク分割 + 必要分のみ fetch という設計の方が将来の記事増に強い。Fuse.js は曖昧検索向けでそもそも全文インデックス用途ではない。

### 候補 C: Google Programmable Search Engine / 外部埋め込み検索

**却下理由:** 実装は容易だが広告・ブランディング・プライバシー (クエリの外部送信) の制約があり、`--kw-*` トークン準拠のデザイン統一やダークモード対応が困難。サイトの体験品質要件に合わない。

---

## Revisit When

- 記事数増加で `dist/pagefind/` の合計サイズ・初回検索レイテンシが体感で劣化したとき (チャンク戦略の見直し / 代替検討)。
- 日本語検索品質への要求が「キーワードヒット」を超えて部分一致・あいまい検索・サジェストに及んだとき (Pagefind の CJK サポートは語境界セグメント方式で部分一致が弱い。upstream の [Pagefind#987](https://github.com/Pagefind/pagefind/issues/987) の進捗を確認し、必要ならサーバ型検索を再評価する)。
- Pagefind がメジャーアップデートで Component UI / API に破壊的変更を入れたとき (`pnpm-workspace.yaml` の pin と検索 UI ラッパーの再検証)。
- Astro が SSG 以外 (SSR / ハイブリッド) へ戦略変更したとき (ビルド後処理という前提が崩れるため再評価)。
