# 0016 — CMS を Keystatic から Sveltia CMS へ移行する

- **ステータス**: Proposed
- **決定日**: 2026-06-25
- **決定者**: @keroway
- **関連 Issue**: [#412 CMS を Keystatic から Sveltia CMS へ移行する（Astro バージョンロック解消）](https://github.com/keroway/astro-blog/issues/412)
- **関連 PR**: （未着手）
- **関連 ADR**: 0002（CMS: Keystatic 採用 / 本 ADR が supersede 候補）、0005（Keystatic admin ランタイム）、0009（本文 content フォーマット）、0014（Keystatic Google Fonts 除去）、0015（Pagefind 検索基盤）

---

## コンテキスト

[ADR 0002](./0002-cms.md) で Git ベース CMS に **Keystatic** を採用し、`/keystatic` admin を Vercel Function として配信している（[ADR 0005](./0005-keystatic-admin-runtime.md)）。本文は Markdoc（`.mdoc`）形式（[ADR 0009](./0009-content-authoring-format.md)）。

その後、**Astro 7.0.2 がリリース**され（[#408](https://github.com/keroway/astro-blog/issues/408)）、メジャーアップを検討したところ、統合の互換性で 2 件のブロッカーが判明した。

1. **`@keystatic/astro@5.1.0`** — peer が `astro 2..6` 止まりで Astro 7 非対応。本リポジトリは既に `peerDependencyRules` で keystatic>astro を `"6"` に固定し、`@keystatic/core` に patch も当てている。
2. **`astro-pagefind@2.0.0`** — peer が `astro ^2..^6`（[ADR 0015](./0015-pagefind-search-platform.md)、本 ADR のスコープ外）。

調査（[#412](https://github.com/keroway/astro-blog/issues/412)）で以下が確定している:

- **React は Keystatic 専用**。`react` / `react-dom` / `@astrojs/react` / `@types/react*` の利用箇所は `keystatic.config.ts` と `astro.config.mjs` の `react()` のみで、`src/` 内に React コンポーネントは存在しない。
- **Markdoc タグ（`callout` / `link-card`）の実コンテンツでの使用は 0 件**。全 59 記事は実質「YAML frontmatter + 標準 Markdown」であり、`.mdoc` ファイルは無改修で据え置ける。
- 先日 overrides で塞いだ **js-yaml 脆弱性（GHSA, merge key DoS）の出どころは `@keystatic/core`**。

確定している制約:

- 本サイトは Vercel 配信・GitHub リポジトリ・PR ベースのレビューフロー（main ブランチ保護）を前提とする。
- コンテンツの正本は `src/content/{blog,works}/*.mdoc`、Astro Content Collections（`content.config.ts` の Zod スキーマ）で型検証する。この型安全性は CMS と独立に維持する。

流動的な点:

- **Sveltia の GitHub backend における PAT（個人アクセストークン）簡易ログインは現状「未実装」**。GitHub の client-side PKCE リリース待ち（2026-06 時点で未提供）。当面は OAuth Authorization Code フロー（外部 OAuth プロキシ）が必要。

---

## 決定事項

**CMS を Keystatic から Sveltia CMS へ移行する（Proposed）。** Sveltia は CDN 配信の静的 SPA で Astro に一切依存しないため、`public/admin/`（または `/keystatic` 廃止後の `/admin`）に admin HTML + `config.yml` を置く構成とする。本文 `.mdoc` ファイルは `extension: mdoc` / `format: yaml-frontmatter` 指定でそのまま読み書きし、コンテンツ・URL は無変更とする。認証は当面 **OAuth Authorization Code フロー**（Cloudflare Workers 製 `sveltia-cms-auth` 等の OAuth プロキシ + GitHub OAuth App）を用い、ローカル編集は File System Access API でプロキシなし運用とする。

*Rationale:* Sveltia は Astro peer 依存を持たないため、**Astro バージョンロックの本命（CMS 側）を恒久的に解消**できる。同時に **React 依存ツリーを丸ごと削除**でき、`@keystatic/core` 由来の脆弱性 override・patch・peerDependencyRule も一掃される。本文が実質プレーン Markdown のため移行コストが低く、Astro 側の content loader / Zod スキーマも無改修で済む。Decap CMS 互換で Editorial Workflow（ブランチ→PR）も再現でき、既存のレビュー運用を維持できる。

### スコープと段階

1. `config.yml` を作成し `keystatic.config.ts` の schema を Decap widget へ移植（slug/text/date/image/select/list/boolean/string(url)/markdown）。
2. OAuth プロキシ（Cloudflare Workers）+ GitHub OAuth App を用意。ローカルは File System Access API。
3. `astro.config.mjs` から `keystatic()` / `react()` を除去、依存（`@keystatic/*` `@astrojs/react` `react*`）を削除。`pnpm-workspace.yaml` の keystatic 関連 override / patch / peerDependencyRule を削除。
4. ADR 0005（Keystatic admin ランタイム）を Deprecated 化し、admin の静的配信へ移行。`/keystatic` リダイレクト or 410。
5. README / `docs/cms-flow.md` / `docs/keystatic-authoring.md` を更新。
6. **本 ADR は Astro 7 化（[#408](https://github.com/keroway/astro-blog/issues/408)）の前提作業ではあるが、pagefind ブロッカーとは独立**。Astro 7 達成には別途 pagefind 対応が必要。

---

## 却下した候補

### 候補 A — Keystatic に留まり Astro 6 に固定し続ける

**却下理由:** Astro 6 系のセキュリティ・機能追従が将来的に先細る。keystatic>astro の peer を `--force`/override で 7 に無理通しする手もあるが、admin / API ランタイム（Vercel Function）が壊れるリスクがあり「破壊的変更を黙って進めない」方針に反する。`@keystatic/astro` が Astro 7 peer を公式サポートするまで CMS が恒久ブロッカーであり続ける。

### 候補 B — Decap CMS（旧 Netlify CMS）へ移行

**却下理由:** Decap も framework-agnostic で Astro ロックは外れるが、メンテナンス停滞・UX の古さが知られる。Sveltia は Decap の設定/API/ワークフロー互換を保ったままモダンに書き直した後継であり、同等の移行コストでより良い UX/i18n/モバイル対応が得られる。Decap を選ぶ積極的理由がない。

### 候補 C — TinaCMS など別系統の Git CMS へ移行

**却下理由:** Tina は独自のクラウド/サーバ前提や GraphQL レイヤを伴い、本サイトの「静的 + 軽量 + ベンダーロック回避」方針と相性が悪い。Sveltia の「CDN 配信の静的 SPA・データはブラウザと Git backend 間で完結」のほうが現行思想に近い。

### 候補 D — CMS を廃し手書き Markdown + スクリプト運用に戻す

**却下理由:** 非エンジニア編集や将来の編集体験を切り捨てることになる。`scripts/`（frontmatter 補助・alt lint）と CMS は補完関係にあり、GUI 編集の価値は残す。

---

## Revisit When

- `@keystatic/astro` が `astro ^7` 以降を公式 peer サポートし、移行コストに見合わなくなったとき（＝ Keystatic 据え置きの再評価）。
- Sveltia の GitHub backend で PAT / client-side PKCE 認証が正式リリースされ、OAuth プロキシが不要になったとき（認証構成の簡素化）。
- Sveltia CMS の開発が停滞・アーカイブ化し、保守性に懸念が生じたとき。
- 本文で Markdoc タグ（callout / link-card 等）を CMS から多用する要件が生じ、Sveltia の editorComponents 実装コストが移行便益を上回ったとき。
- `astro-pagefind` も含め Astro 7 化の全ブロッカーが解消し、移行を実施するか最終判断するとき。
