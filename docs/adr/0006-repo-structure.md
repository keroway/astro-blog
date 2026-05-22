# 0006 — CMS リポジトリ構成: 単一リポジトリ継続

- **ステータス**: Accepted
- **決定日**: 2026-05-22
- **決定者**: @keroway
- **関連 Issue**: [#88 CMS リポジトリ構成 3 パターンを比較し ADR を起票する](https://github.com/keroway/astro-blog/issues/88), [#30 CMS リポジトリ構成（別 repo / monorepo）の決定](https://github.com/keroway/astro-blog/issues/30)
- **前提 ADR**: [0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)

---

## コンテキスト

M5 マイルストーン「CMS 環境」で Keystatic を CMS として採用した（ADR 0002）。CMS を導入するにあたり、リポジトリをどのように構成するかを決定する必要があった。

現状の構成:

- `keroway/astro-blog` — 単一リポジトリ。Astro 6 + TypeScript で構築。記事は `src/content/blog/*.md` として管理。
- `pnpm-workspace.yaml` は現在 `.` のみを指し、monorepo 構造は持たない。
- Keystatic は `keystatic.config.ts` をリポジトリルートに配置することで動作。

### 検討した選択肢

| 構成 | 概要 |
|------|------|
| **A: 単一リポジトリ継続** ★採用 | 既存 `keroway/astro-blog` を維持。`keystatic.config.ts` をルートに配置するだけで CMS が機能する |
| **B: 別リポジトリ** | `keroway/astro-cms` を分離して CMS 設定・独自ワークフロー・認証境界を別管理 |
| **C: monorepo（pnpm workspace）** | `apps/web` + `apps/cms` + `packages/content-schema` などに分割し pnpm workspace で統合 |

---

## 決定事項

**A: 単一リポジトリ継続** を採用する。

ADR 0002「CMS / コンテンツ管理: Keystatic 採用」の「関連 Issue への影響 > #30 リポジトリ構成」セクションにおいて、すでに次の方針を明示している:

> monorepo 化は不要。単一リポジトリ継続で十分。
> Keystatic は `keystatic.config.ts` をルートに置くだけで動作し、`apps/web` / `apps/cms` / `packages/content-schema` のような分割を要求しない。

本 ADR はその方針を正式に記録するものである。

---

## 比較評価

### A: 単一リポジトリ継続

**メリット**:

- Keystatic は `keystatic.config.ts` をリポジトリルートに置くだけで機能する。構成変更ゼロで CMS が動作済み。
- 既存 52 記事（`src/content/blog/*.md`）・Zod スキーマ（`src/content.config.ts`）・CI/CD（`.github/workflows/`）・Vercel 設定（`vercel.json`）をそのまま継続できる。
- `keystatic.config.ts` と `src/content.config.ts` が同一リポジトリにあるため、スキーマ変更時の参照が簡単。
- CI / Vercel デプロイ設定を変更する必要がない。

**デメリット**:

- CMS 設定と Web サイトコードが同一リポジトリに混在する（単一書き手の個人ブログでは問題にならない）。

### B: 別リポジトリ

**メリット**:

- CMS 設定・認証・独自ワークフローを Web サイトと完全に分離できる。
- CMS をチームで独立開発・デプロイできる。

**デメリット**:

- Keystatic は Git ベース CMS であり、記事ファイル（`src/content/blog/*.md`）と同一リポジトリに存在することが前提設計。別リポジトリにすると Keystatic の動作モデルと乖離する。
- `content.config.ts`（Zod スキーマ）と Keystatic コレクション定義を別リポジトリで同期させる仕組みが必要になり、管理コストが増大する。
- CI・Vercel 設定を 2 リポジトリ分管理する必要がある。

**却下理由**: Keystatic の設計思想と相性が悪く、実装コストに見合う利点がない。個人ブログの規模では過剰。

### C: monorepo（pnpm workspace）

**メリット**:

- `packages/content-schema` として Zod スキーマを共有モジュール化し、型安全性を高められる。
- `apps/web` と `apps/cms` で共通コンポーネントを共有できる。

**デメリット**:

- 現在の `apps/web` への移行コスト: ディレクトリ構造変更・lockfile 再生成・CI ジョブ更新・Vercel の `Root Directory` 設定変更が必要。
- Keystatic は同一リポジトリ内の Markdown ファイルを直接操作するため、`apps/web/src/content/` のようにパスが変わると `keystatic.config.ts` の `path` 設定も更新が必要。
- 個人ブログ（書き手 1 名）では共有コンポーネントのメリットが薄く、移行コストが利益を上回る。

**却下理由**: 移行コストと保守負担が現規模（個人ブログ）には不釣り合い。Keystatic が要求する分割構造でもない。

---

## 影響

### Issue #89 (monorepo 採用時の移行 PR 段取りドキュメント)

本 ADR で monorepo を採用しないことが確定したため、Issue #89 は着手条件を満たさない。クローズ済み（2026-05-22）。

### Issue #30 (CMS リポジトリ構成の決定)

本 ADR の策定により、Issue #30 の完了条件「採用案の ADR 化」が充足された。Issue #88 の PR マージと同時に #30 もクローズする。

### 将来の移行判断

以下のいずれかが発生した場合、本 ADR の再評価を検討する:

- 書き手が複数になり、CMS の認証・権限管理を Web サイトと独立させる必要が生じた場合
- コンテンツスキーマを複数の Web アプリで共有する必要が生じた場合
- リポジトリサイズ（記事・画像）が単一リポジトリ管理の限界を超えた場合

---

## 参考

- [ADR 0002 — CMS / コンテンツ管理: Keystatic 採用](./0002-cms.md)（「#30 リポジトリ構成」セクション参照）
- [ADR 0004 — メディア管理: リポジトリ内 public/images/ 継続](./0004-media-storage.md)
- [Issue #30 — CMS リポジトリ構成（別 repo / monorepo）の決定](https://github.com/keroway/astro-blog/issues/30)
- [Issue #88 — CMS リポジトリ構成 3 パターンを比較し ADR を起票する](https://github.com/keroway/astro-blog/issues/88)
