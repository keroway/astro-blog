# CMS 編集 → プレビュー → 本番反映フロー

- **関連 ADR**: [0002 — CMS: Keystatic 採用](./adr/0002-cms.md)、[0003 — レンダリング戦略: SSG 継続](./adr/0003-rendering-strategy.md)
- **関連 Issue**: [#34 プレビュー機能とデプロイフローの設計](https://github.com/keroway/astro-blog/issues/34)
- **作成日**: 2026-05-18

---

## 概要

keroway.com は **Keystatic（Git ベース CMS）+ Vercel SSG** の構成を採用します。
記事の正本は `src/content/blog/*.md` に Git で管理され、CMS はそのファイルを UI 上で読み書きするレイヤーです。

---

## 通常フロー（記事を書いて本番に反映する）

```mermaid
flowchart TD
    A([編集者]) -->|Keystatic UI で記事を作成・編集| B[Keystatic がブランチを作成\ne.g. keystatic/my-article-title]
    B -->|ブランチへコミット| C[GitHub: feature branch]
    C -->|PR を作成| D[GitHub Pull Request]
    D -->|Vercel が自動検知| E[Vercel Preview Deployment\npreview-xxx.vercel.app]
    E -->|プレビュー URL で確認| F{レビュー OK?}
    F -->|修正が必要| A
    F -->|OK| G[PR を main にマージ]
    G -->|Vercel が main を自動検知| H[Vercel 本番ビルド\nSSG: astro build]
    H -->|配信開始| I([keroway.com で公開])
```

### ポイント

- Keystatic のブランチモード（`KEYSTATIC_GITHUB_APP_*` 環境変数設定後）では、UI の「保存」でブランチへのコミットが自動実行される
- Vercel は GitHub と連携しており、PR 作成時に自動でプレビュービルドをトリガーする
- SSG のため、本番反映はマージ後のビルド完了まで数分かかる（通常 1〜3 分）

---

## ローカル編集フロー（開発者向け）

```mermaid
flowchart LR
    A([開発者]) -->|pnpm run dev| B[Astro dev サーバー\nlocalhost:4321]
    B -->|/keystatic にアクセス| C[Keystatic ローカル UI]
    C -->|記事を編集・保存| D[ファイルへ直接書き込み\nsrc/content/blog/my-post.md]
    D -->|git commit + push| E[GitHub: feature branch]
    E -->|PR 作成 → レビュー → マージ| F([本番反映])
```

ローカルモードでは Keystatic UI が `localStorage` / ファイルシステムに直接書き込むため、GitHub 認証は不要です。

---

## ドラフト閲覧の方法

`draft: true` を設定した記事は本番ビルドで除外されます。ドラフト状態の記事をレビュアーや本人が確認する方法は以下の 2 つです。

### オプション A: Vercel Preview Deployment URL（推奨）

PR ブランチのビルドが成功すると Vercel が一意のプレビュー URL を発行します。

```
https://astro-blog-git-<branch-name>-keroway.vercel.app/
```

- **メリット**: 追加設定不要。PR にコメントとして URL が自動投稿される
- **デメリット**: URL を知っていれば誰でもアクセス可能（非公開コンテンツを共有しているわけではないが、URLが漏れると閲覧される）
- **適用場面**: 個人ブログで公開前の確認のみなら十分

### オプション B: Vercel Password Protection（要 Vercel Pro）

Vercel Pro 以上のプランで、プレビュー URL にパスワードを設定できます。

```
# vercel.json に追加（Pro プランのみ）
{
  "passwordProtection": {
    "deploymentType": "preview"
  }
}
```

- **メリット**: URL が漏れても認証なしでは閲覧不可
- **デメリット**: Vercel Pro プランが必要（月額 $20〜）
- **適用場面**: 複数人でのレビューや、機密度の高いコンテンツの確認

### オプション C: ローカルプレビュー

```bash
pnpm run dev
# → localhost:4321 で draft 記事も表示される
```

ただし `getCollection` のフィルタが `!data.draft` のため、現状ではローカルでも draft 記事は除外されます。ローカル確認が必要な場合は一時的に `draft: false` に変更するか、dev 環境用のフィルタ分岐を追加してください。

**現在の実装（参考）:**

```typescript
// src/pages/blog/index.astro, src/pages/index.astro
const posts = (await getCollection('blog', ({ data }) => !data.draft))
```

---

## 公開予約（`pubDate` 未来日の扱い）

SSG は**ビルド時点**でサイトを静的出力するため、未来日の記事を自動的に「その日時に公開する」機能はビルトインされていません。

### 現状の挙動

- `draft: false` かつ `pubDate` が未来日の場合 → **ビルド時点では公開される**（現在のフィルタは draft フラグのみ）
- 未来日記事を非公開にするには `draft: true` を明示的に設定する必要がある

### 公開予約を実現する方法

#### 方法 1: 手動 draft 切り替え（現実的・推奨）

```
1. 記事を draft: true で作成・PR マージ（本番には出ない）
2. 公開したい日に draft: false に変更してコミット
3. Vercel が自動でリビルドして公開される
```

- シンプルで確実。個人ブログの規模なら十分

#### 方法 2: Vercel Deploy Hook + 外部 cron（自動化）

Vercel の Deploy Hook URL に対して定期的に POST することで、時刻ベースの自動リビルドが可能です。

```mermaid
sequenceDiagram
    participant Cron as 外部 Cron<br/>(GitHub Actions / Vercel Cron)
    participant Hook as Vercel Deploy Hook
    participant Build as Vercel SSG Build
    participant Site as keroway.com

    Note over Cron: pubDate の日時（UTC）に発火
    Cron->>Hook: POST /api/deploy/xxx
    Hook->>Build: ビルドをトリガー
    Build->>Build: astro build<br/>（pubDate <= now の記事のみ含む）
    Build->>Site: 新バイナリをデプロイ
```

**実装例: GitHub Actions での定時ビルド**

```yaml
# .github/workflows/scheduled-publish.yml
name: Scheduled Publish
on:
  schedule:
    # 毎日 JST 9:00 (UTC 0:00) に実行
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  trigger-build:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Vercel Deploy Hook
        run: |
          curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK_URL }}"
```

**実装例: Vercel Cron Jobs（`vercel.json`）**

```json
{
  "crons": [
    {
      "path": "/api/trigger-build",
      "schedule": "0 0 * * *"
    }
  ]
}
```

※ Vercel Cron は Vercel Functions エンドポイントを叩く形式のため、SSG のみでは使用不可。SSR adapter が必要。

#### 方法 3: pubDate フィルタをビルド時に適用

```typescript
// src/pages/blog/index.astro - pubDate フィルタを追加する例
const now = new Date();
const posts = (
  await getCollection(
    'blog',
    ({ data }) => !data.draft && data.pubDate <= now
  )
)
```

このフィルタを追加すると、`draft: false` のまま `pubDate` を未来日に設定することで予約投稿が機能します。ただし **ビルドしないと反映されない** ため、方法 2 の cron との組み合わせが前提です。

### 推奨構成

| 要件 | 推奨方法 |
|------|---------|
| 不定期・手動での公開 | 方法 1（draft 切り替え） |
| 定時自動公開（毎日特定時刻） | 方法 3 + 方法 2（GitHub Actions cron） |
| 複数記事の予約管理 | 方法 3 + 方法 2 |

---

## 環境変数一覧（Keystatic ブランチモード）

Preview デプロイでは Keystatic 統合自体が mount されない (`astro.config.mjs` の `VERCEL_ENV === "preview"` 分岐) ため、Preview 列の env を設定しても無視される。Preview からの編集はそもそも不可。

| 変数名 | 説明 | ローカル dev | Vercel Production | Vercel Preview |
|--------|------|------------|------------------|---------------|
| `PUBLIC_KEYSTATIC_STORAGE_KIND` | `local` / `github` の切替フラグ。`keystatic.config.ts` がブラウザにも bundle される都合上、`PUBLIC_` プレフィックスが必須 (`import.meta.env` 経由) | 通常未設定（= local） | `github`（必須・未設定なら build fail） | 設定不要（統合 mount しない） |
| (リポジトリ owner / name) | `keystatic.config.ts` に `keroway/astro-blog` をハードコード | env 不要 | env 不要 | env 不要 |
| `KEYSTATIC_GITHUB_CLIENT_ID` | Keystatic GitHub App の Client ID | `.env` | Vercel 環境変数 | 設定不要 |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | Keystatic GitHub App の Client Secret | `.env` | Vercel 環境変数（暗号化） | 設定不要 |
| `KEYSTATIC_SECRET` | セッション署名用の乱数文字列（`openssl rand -hex 32` 等で生成） | `.env` | Vercel 環境変数（暗号化） | 設定不要 |
| `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` | Admin UI から GitHub App をインストールさせる際の遷移先 slug | `.env` | Vercel 環境変数 | 設定不要 |
| `VERCEL_DEPLOY_HOOK_URL` | 公開予約 cron 用のフック URL | 不要 | GitHub Actions Secrets | 不要 |

> **注意**: `KEYSTATIC_GITHUB_CLIENT_SECRET` と `KEYSTATIC_SECRET` は機密情報のため、`.env` には追加しても `.gitignore` 対象であることを確認してください。サンプルは `.env.example` を参照。

---

## 本番有効化セットアップ手順（Vercel + GitHub App + branch storage）

ADR 0005「Keystatic admin ランタイム」決定後、本番 `https://keroway.com/keystatic` で Keystatic Admin UI を運用するための手順です。

### 前提

- 本リポジトリの `astro.config.mjs` に `@astrojs/vercel` adapter が設定済み（`output: "static"` + on-demand な `/keystatic/*` 関数）
- `keystatic.config.ts` の `storage` が `PUBLIC_KEYSTATIC_STORAGE_KIND` で `local` / `github` を切り替えられる構造になっている
- main ブランチに保護設定（PR 必須・レビュー必須）が入っている

### 手順

1. **ローカルで GitHub App セットアップを起動する**
   - `.env` に `PUBLIC_KEYSTATIC_STORAGE_KIND=github` を設定 (リポジトリ owner / name は `keystatic.config.ts` でハードコード済み)。
   - `pnpm run dev` で http://127.0.0.1:4321/keystatic を開き、「GitHub App をセットアップ」のフローに従う。
   - Keystatic が自動で GitHub App を作成し、生成された Client ID / Client Secret / `KEYSTATIC_SECRET` / App slug を `.env` に書き込む。
2. **GitHub App の権限を確認する**
   - Permissions: Contents `Read & Write`、Pull requests `Read & Write`、Metadata `Read`
   - Install 対象は `keroway/astro-blog` のみ（個人 account scope 推奨）
3. **Vercel 側に環境変数を登録する**
   - Vercel ダッシュボード → Project → Settings → Environment Variables から、Production 環境向けに以下を登録:
     ```
     PUBLIC_KEYSTATIC_STORAGE_KIND=github
     KEYSTATIC_GITHUB_CLIENT_ID=...
     KEYSTATIC_GITHUB_CLIENT_SECRET=...  (Encrypted)
     KEYSTATIC_SECRET=...                 (Encrypted)
     PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=keroway-keystatic
     ```
   - **Preview 環境では Keystatic 自体を無効化する**（環境変数を増やす必要なし）。`astro.config.mjs` が `VERCEL_ENV=preview` のとき Keystatic 統合を mount しないため、Preview URL の `/keystatic` は 404 になる。Preview の Vercel Function も ephemeral filesystem なので、もし local モードで起動すると "保存できた" と誤認させてデータロストになるため、編集は禁止する設計。Preview は記事ページのプレビューにのみ使う。
   - **fail-fast ガード**: Vercel Production (`VERCEL_ENV=production`) では `PUBLIC_KEYSTATIC_STORAGE_KIND=github` が**必須**。未設定や `local` 指定のままだと `astro.config.mjs` が build 時に `Error: Keystatic: VERCEL_ENV=production では PUBLIC_KEYSTATIC_STORAGE_KIND=github が必須です` で fail する。設定漏れのままデプロイされて Admin UI が機能不全のまま放置されるのを防ぐための意図的な挙動。
4. **デプロイ後に手動検証する**
   - `https://keroway.com/keystatic` にアクセス → GitHub 認証 → 編集 → 保存で `keystatic/<title>` ブランチへ commit → PR 作成までを確認する。
   - **未認証ユーザーが書き込めないこと**: Keystatic GitHub mode は GitHub App 経由でトークンを発行するため、リポジトリへの write 権限を持たない GitHub アカウントでは PR 作成に失敗する仕様。Admin UI 自体は公開されているため、追加で公開を制限したい場合は Vercel Password Protection（Pro プラン）または Vercel Authentication（Preview のみ無料）を併用する。

### 保護ブランチ運用との整合

- Keystatic は `keystatic/<slug>` ブランチへ直接 commit し、main へは PR 経由でしかマージされない。
- main ブランチの保護設定（PR 必須 / 1 レビュー / Required status checks）を有効化しておけば、Keystatic からの編集も他の PR と同じレビューフローに乗る。
- Keystatic の "Draft" 機能で連続編集 → 1 PR にまとめる運用が可能。

---

## 参考リンク

- [Keystatic ドキュメント — GitHub mode](https://keystatic.com/docs/github-mode)
- [Keystatic ドキュメント — Astro installation](https://keystatic.com/docs/installation-astro)
- [Vercel — Deploy Hooks](https://vercel.com/docs/deployments/deploy-hooks)
- [Vercel — Preview Deployments](https://vercel.com/docs/deployments/preview-deployments)
- [Vercel — Password Protection](https://vercel.com/docs/security/deployment-protection/methods-to-protect-deployments/password-protection)
- [ADR 0002 — CMS: Keystatic 採用](./adr/0002-cms.md)
- [ADR 0003 — レンダリング戦略: SSG 継続](./adr/0003-rendering-strategy.md)（ADR 0005 で Superseded）
- [ADR 0005 — Keystatic admin ランタイム: Vercel adapter + hybrid 出力](./adr/0005-keystatic-admin-runtime.md)
