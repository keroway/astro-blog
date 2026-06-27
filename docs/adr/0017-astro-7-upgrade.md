# 0017 — Astro 7 へのメジャーアップグレード

- **ステータス**: Proposed
- **決定日**: 2026-06-26
- **決定者**: @keroway
- **関連 Issue**: [#408 Astro 7 へのメジャーアップグレードを実施する（ブロッカー解消済み）](https://github.com/keroway/astro-blog/issues/408)
- **関連 PR**: 後続の実装 PR で参照する
- **関連 ADR**: 0015（Pagefind 検索基盤）、0016（CMS Sveltia 移行）、0003/0005（SSG レンダリング戦略）、0013（Web フォント自己ホスト）

---

## コンテキスト

Astro **7.0.3** が latest（現状 `astro@^6.4.8` / installed 6.4.8）。当初 [#408](https://github.com/keroway/astro-blog/issues/408) でメジャーアップを阻んでいた 2 件のブロッカーは、別系統の意思決定で**いずれも依存ツリーから消滅**した。

- `@keystatic/astro`（peer `astro 2..6`）→ ADR 0016 で CMS を Sveltia へ移行し除去。`@astrojs/react` / `react*` も除去。
- `astro-pagefind`（peer `astro ^2..^6`）→ ADR 0015 で `pagefind` Node API を `astro.config.mjs` にインライン化して除去。

本 ADR は、残る依存上限のないアップグレードを**いつ・どの範囲で・どう検証して実施するか**の判断を記録する。

### 確定済みの事実（2026-06-26 時点で実機調査）

| パッケージ | installed | Astro 7 対応版 | astro peer | 方針 |
|-----------|-----------|---------------|-----------|------|
| astro | 6.4.8（bundles vite 7.3.5） | **7.0.3**（bundles vite `^8.0.13`） | — | ⬆ 更新 |
| @astrojs/vercel | 10.0.8 | **11.0.0** | `^7.0.0-alpha.0` | ⬆ 更新 |
| @astrojs/markdoc | 1.0.6 | **2.0.1** | `^7.0.0-alpha.0` | ⬆ 更新 |
| @unocss/astro | 66.7.2 | **66.7.3**（vite peer に `^8` 含む） | — | ⬆ patch |
| @astrojs/sitemap | 3.7.3 | 3.7.3（astro peer 宣言なし） | なし | 据え置き・動作確認 |
| @astrojs/rss | 4.0.18 | 4.0.18（astro peer 宣言なし） | なし | 据え置き・動作確認 |
| @astrojs/check | 0.9.9 | 0.9.9（peer `typescript ^5 \|\| ^6`） | なし | 据え置き（本リポは ts `^6`） |
| pagefind | 1.5.2 | 1.5.2（astro peer なし） | なし | 据え置き |

- **Node engines は据え置き**（`>=22.12.0`）。ランタイム面の障壁なし。
- **実質の破壊的変更は Vite 7 → 8 のみ**。astro / vercel / markdoc のメジャーは peer 整合のための同時更新。
- astro@7.0.3 は `peerDependencies` に **`@astrojs/markdown-remark@7.2.0`** を宣言する。pnpm（`minimumReleaseAgeStrict: true`）で未解決 peer 警告／失敗が出る場合は明示追加を検討する。

### 流動的な点

- `pnpm-workspace.yaml` のセキュリティ overrides（`rollup` / `esbuild` / `postcss` / `yaml` / `picomatch` / `path-to-regexp` / `tar` / `js-yaml`）が Vite 8 系の依存解決と衝突しないか（`minimumReleaseAgeStrict` により解決失敗で fail する）。
- `vite.build.rollupOptions.external: ["/pagefind/pagefind.js"]`（#341）が Vite 8 / Rollup 4 系で引き続き必要か。
- pagefind インライン統合（`astro:build:done` / `astro:server:setup` フック / `astro:config:setup` の `config.build.client`）の Astro 7 互換。

---

## 決定事項

**Astro 7 へのアップグレードを実施する。`astro@^7` + `@astrojs/vercel@^11` + `@astrojs/markdoc@^2` + `@unocss/astro@^66.7.3` を単一 PR でまとめて更新し、検証ゲートを全通過させてからマージする。** astro peer を持たない統合（sitemap / rss / check / pagefind）は据え置き、動作確認のみ行う。

*Rationale:* astro / vercel / markdoc は peer で相互拘束されるため分割更新は中間状態が壊れる。Node 据え置きで破壊的変更は実質 Vite 7→8 に集約されるため、まとめて上げて単一の検証サイクルで確定するほうが安全かつ低コスト。`--force` / override での無理通しは一切行わない（ブロッカーは既に解消済み）。

### 実施手順

1. **依存更新**: `astro@^7` / `@astrojs/vercel@^11` / `@astrojs/markdoc@^2` / `@unocss/astro@^66.7.3`。`pnpm install` で peer 解決を確認（`@astrojs/markdown-remark` 警告が出れば明示追加）。
2. **overrides 棚卸し**: `pnpm-workspace.yaml` の overrides が Vite 8 ツリーで解決可能か確認。不要になった pin（特に `rollup` / `esbuild` の下限）は削除候補として精査。`js-yaml` override は upstream ツリーから消えていれば削除。
3. **Vite 8 破壊的変更の確認**: `rollupOptions.external`（`/pagefind/pagefind.js`）の要否、`vite.config` 相当設定（`astro.config.mjs` の `vite` ブロック）の非互換を確認。
4. **pagefind 統合の互換確認**: build で `dist/pagefind/` が生成されること、dev（`astro:server:setup` + sirv）で `/pagefind/` が配信されることを確認。
5. **検証ゲート（全通過が必須）**:
   - `pnpm run build`（= `astro check && astro build`）green
   - `pnpm exec playwright test`（E2E）green
   - Lighthouse スコアが現状以上（LCP/CLS 退行なし）
   - Pagefind 検索 UI（`BlogSearch.astro`）が `/blog` で動作
   - OG 画像生成（satori / resvg）・RSS・sitemap の出力差分なし
6. **本 ADR を Accepted へ昇格**し、実装 PR の番号を追記。

### スコープ外

- 画像の astro:assets 本格移行（[#410](https://github.com/keroway/astro-blog/issues/410)）は独立タスク。本アップグレードでは扱わない。
- Dependabot は astro / typescript のメジャーを ignore 済み（README）。本件は手動運用を継続。

---

## 却下した候補

### 候補 A — Astro 6 系に留まり続ける

**却下理由:** ブロッカーは既に解消しており、留まる積極的理由がない。Astro 6 系はセキュリティ・機能追従が将来的に先細り、Vite 7 系の脆弱性追従も縮小する。先送りするほど Vite 7→8 以外の差分が累積して移行コストが上がる。

### 候補 B — 統合を 1 つずつ段階的に更新する

**却下理由:** astro / @astrojs/vercel / @astrojs/markdoc は peer（`astro ^7`）で相互拘束されるため、片方だけ上げると peer 不整合で install が壊れる（`minimumReleaseAgeStrict` 下では fail）。中間状態に意味がなく、検証サイクルが増えるだけ。

### 候補 C — `--force` / override で Astro 7 を無理通しする

**却下理由:** そもそもブロッカーが解消済みで無理通しは不要。かつ「破壊的変更を黙って進めない」方針（ADR 0016 でも踏襲）に反する。

---

## Revisit When

- アップグレード実施 PR がマージされ検証ゲートを全通過したとき（本 ADR を Accepted へ昇格し PR 番号を追記）。
- Vite 8 / Rollup 4 系の破壊的変更で `pnpm-workspace.yaml` の overrides が解決不能になり、追加 pin や代替が必要になったとき。
- `@astrojs/sitemap` / `@astrojs/rss` / `pagefind` が Astro 7 で非互換挙動を示したとき（astro peer 非宣言のため事前検知できず、ビルド/E2E で検出する想定）。
- 次のメジャー（Astro 8 / Vite 9 等）が出たとき（本 ADR の手順をテンプレートとして再評価）。
