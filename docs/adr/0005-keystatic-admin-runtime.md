# 0005 — Keystatic admin ランタイム: Vercel adapter + on-demand 出力で本番有効化

- **ステータス**: Proposed
- **決定日**: 2026-05-21
- **決定者**: @keroway
- **関連 Issue**: [#144 Keystatic 本番有効化](https://github.com/keroway/astro-blog/issues/144)
- **置換対象 ADR**: [0003 — レンダリング戦略: SSG 継続](./0003-rendering-strategy.md)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)

---

## コンテキスト

ADR 0002 で Keystatic を CMS として採用し、ADR 0003 で「Vercel SSG を継続、adapter は導入しない」と判断した。一方で `keystatic.config.ts` は `storage.kind: "local"` のみで、本番 (`https://keroway.com/keystatic`) からは記事編集ができない状態が続いていた。Issue #144 は本番から Keystatic Admin UI を使えるようにすることを求めている。

Keystatic 公式が明示しているとおり、Keystatic Admin UI は Node.js API を使うサーバーサイドコードを必要とする (`Because Keystatic needs to run serverside code and use Node.js APIs, you will need to add an Astro adapter`)。つまり ADR 0003 の「adapter を導入しない」決定とは両立しない。

ADR 0003 は「Hybrid（一部ページのみ SSR）」を却下した理由として「対象ページが現状存在しない」「将来必要になったら導入可」と書いていた。Issue #144 によって「`/keystatic/*` が SSR 必須」という対象ページが具体化したため、本 ADR で ADR 0003 を Superseded にし、決定を更新する。

### 検討した選択肢

1. **`@astrojs/vercel` を導入し、`output: "static"` + on-demand な Keystatic ルートで運用（本 ADR 採用）**
2. ADR 0003 のまま「本番では Keystatic を動かさない」運用を継続（Issue #144 を諦める）
3. Keystatic を別ドメイン / 別ホスティングに分離（例: `cms.keroway.com` で Node.js を動かす）
4. Keystatic Cloud に移行

---

## 決定事項

**`@astrojs/vercel` (v10.0.7) を adapter として導入し、`output: "static"` を維持したまま Keystatic の Admin / API ルートだけを on-demand な Vercel Function として動かす。** ADR 0003 を Superseded にする。

採用構成:

- `astro.config.mjs`
  - `adapter: vercel()`
  - `output: "static"`（既定値、明示）
  - `integrations: [..., react(), keystatic()]`（本番でも常時 mount）
- `keystatic.config.ts`
  - `KEYSTATIC_STORAGE_KIND` 環境変数で `local` / `github` を切替
  - 本番 (`github`) では branch storage を使用し、`keystatic/<slug>` ブランチへ commit → main へ PR
- `vercel.json` は `installCommand` / `buildCommand` を据え置き（adapter が `dist/` の構造を SSG + Function に変換するため、Vercel 側で追加設定は不要）

---

## 採用理由（Why option 1）

1. **既存のコンテンツ配信は SSG のまま維持できる**: ブログ・Works などの記事ページは引き続き静的 HTML として配信される。Function 化されるのは `/keystatic/*` と `/api/keystatic/*` のみで、本体の読み込み速度・CDN キャッシュへの影響はゼロ。
2. **Keystatic 公式の推奨経路**: Astro × Keystatic を本番運用するときの標準手順。ドキュメント・サンプルが揃っており、運用上の未知数が少ない。
3. **Issue #100 / #101 の前提が解ける**: Vercel Preview と CMS の連携検証 (#100)、ビルドフック設計 (#101) はいずれも本 ADR が前提条件だった。これらを着手可能な状態にする。
4. **依存追加が adapter 1 つだけ**: 既に `@keystatic/astro` / `react` は依存に入っており、Vercel ホスティングも継続。追加で発生するのは `@astrojs/vercel` のみ。
5. **段階導入の出口を閉ざさない**: 将来 Cloudflare 等へ移行する場合でも、adapter を差し替えれば SSG のまま移植できる。Astro の `output: "static"` を保ち続けることで、後戻りコストを最小化する。

---

## 却下した候補

### 2. ADR 0003 のまま「本番では Keystatic を動かさない」

**却下理由**:

- Issue #144 が明示的に「本番 URL `/keystatic` での編集」を求めている。本番化を諦めると Issue #100 / #101 / #34 がいずれもブロックされ、CMS 採用の意義が大きく下がる。
- ローカル編集に閉じる運用は、移動先・出先での記事追加・誤字修正に対応できない。

### 3. Keystatic を別ドメイン / 別ホスティングに分離

**却下理由**:

- ホスティング先（Node.js 実行環境）を別途用意する必要があり、運用対象が増える。
- branch storage を使う限り、`/keystatic` を別ホストに置いてもリポジトリへの commit 経路は同じ。Function を 1 個増やす（本 ADR 採用）で十分。
- 認証境界が分かれることで、ログインフローが複雑化する。

### 4. Keystatic Cloud に移行

**却下理由**:

- ADR 0002 で「Cloud は採用しない」と確定済み。Cloud 採用は別 ADR を要する。
- 本 PR のスコープを大きく外れる。

---

## ADR 0003 との差分

| 項目 | ADR 0003（Superseded） | ADR 0005（本 ADR） |
|------|------------------------|---------------------|
| Astro `output` | `static`（暗黙） | `static`（明示） |
| Adapter | なし | `@astrojs/vercel` |
| `/keystatic` 動作環境 | 開発時のみ | 開発時 + 本番（on-demand Function） |
| 記事ページの配信 | 静的 HTML | 静的 HTML（変更なし） |
| Vercel Function の利用 | なし | `/keystatic/*` と `/api/keystatic/*` のみ |
| プロバイダ移行コスト | 低 | 中（adapter 差し替えが必要） |

ADR 0003 が前提としていた「Vercel SSG の静的配信を継続」「ビルド時のスキーマ検証 `astro check` を維持」は本 ADR でも変更しない。adapter 追加が ADR 0003 の決定原則すべてを否定するわけではなく、Hybrid の発動条件が満たされたための更新と位置付ける。

---

## 関連 Issue / 後続作業

### Issue #144 — 本 ADR とセットで完了

- `keystatic.config.ts` の storage 環境分岐 ✅
- Vercel adapter 導入 ✅
- セットアップ手順 docs ✅
- 本番 `/keystatic` での手動検証（PR レビュー後にユーザーが実施）

### Issue #100 — Vercel Preview × CMS

本 ADR の決定により、Preview 環境でも `KEYSTATIC_STORAGE_KIND` を明示しない限り Keystatic は local モードで動く。Preview から本番リポジトリへ commit が走らない構成を `docs/cms-flow.md` に記載済み。

### Issue #101 — ビルドフック / 公開予約

Vercel Cron Jobs (`vercel.json` の `crons`) は SSR adapter 必須の機能だが、本 ADR で adapter が導入されたため利用可能になる。詳細設計は別 Issue で。

---

## 検証

PR `feat/issue-144-keystatic-prod-enable` で以下を確認:

- `pnpm run lint`（Biome ci）
- `pnpm exec astro check`
- `pnpm exec astro build`（Function 用 entrypoint が `dist/_functions/` に出力されることを確認）
- `pnpm exec playwright test`
- ローカルで `KEYSTATIC_STORAGE_KIND=local` のまま `pnpm run dev` → `/keystatic` で従来通り動くこと

本番反映後の手動検証は PR description に手順を記載する。
