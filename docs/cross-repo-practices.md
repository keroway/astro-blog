# keroway/* 横断ノウハウカタログ

> **注意: 2026-06-12 時点のスナップショットです。**
> 各リポジトリは独立して進化するため、本ドキュメントは時間とともに陳腐化します。
> 新たな調査の知見があれば本ドキュメントを上書きして更新してください。

対象: keroway 配下のアクティブ非フォーク 11 リポジトリ

---

## 目次

1. [比較マトリクス](#1-比較マトリクス)
2. [ドナー / 受け手マップ](#2-ドナー--受け手マップ)
3. [設計パターンの記録](#3-設計パターンの記録)
4. [更新方法](#4-更新方法)

---

## 1. 比較マトリクス

| repo | 言語 / 種別 | Dependabot | CI 構成 | branch 保護 | E2E / テスト | docs / ADR | .claude/ | デプロイ |
|---|---|---|---|---|---|---|---|---|
| **astro-blog** | Astro 6 / ブログ | npm + actions, グループ化, major block | 4 並列 (lint / typecheck / build / E2E) | ruleset (4 checks 必須, 削除 / FF 禁止) | Playwright + lint:alt | docs/ 充実, ADR 体系化は弱い | フル装備 (rules / hooks / commands / agent-memory) | Vercel |
| **timeline-dsl** | Rust / DSL コンパイラ (public) | cargo + actions, lockstep 抑止 | 6+ ジョブ, multi-OS, coverage | ruleset `main-protection` (2026-05-06 ~): 削除禁止 / FF 禁止 / PR 必須 / required checks (`test-and-smoke` / `Test (Windows)` / `Build WebUI`) | unit + E2E smoke + snapshot + Windows | docs/ 最充実 (en/ja), ADR 2 本, CHANGELOG / CONTRIBUTING / SECURITY | フル装備 (agents / skills) | GitHub Pages + crates.io/npm OIDC + Homebrew 自動更新 |
| **timeline-dsl-lp** | Astro + Starlight / docs サイト | npm (/site) + actions, minimal | 多数 (lint / format / unit / build / bundle-size / smoke 5 種 / Lighthouse) | ruleset あり (id: 16918007, active) | Playwright + axe-core + vitest | Starlight 統合 | CLAUDE.md のみ | Cloudflare Pages |
| **code-tactics** | Rust + Svelte / ゲーム | cargo + npm + actions, グループ化 (最良) | Rust / WASM (size budget 256 KiB) / server / Web | branch protection (3 checks, enforce_admins) | 決定論 golden test + vitest + Playwright | ADR 7 本 + template, glossary | settings のみ | GitHub Pages + Tauri |
| **code-tactics-lp** | Astro / LP | npm + actions, グループ化 | 2 ジョブ (verify / linkcheck = lychee) | force push 禁止 / 削除禁止 / linear history 必須 (required status checks は未設定) | なし (lychee で補完) | decisions / tech-stack 等 4 doc | CLAUDE.md のみ | GitHub Pages (サブパス) |
| **reflectorbit** | Zig / ゲーム | actions のみ | build + wasm (zig cache) | ruleset `main protection` (2026-05-27 ~) | physics unit test | docs/ 8 doc, CHANGELOG なし | フル装備 (3 agents + memory + rules) | emscripten Web + native release |
| **reflectorbit-lp** | Astro / LP | npm + actions, グループ化 + Vite override | 2 ジョブ (lint / build) | 保護なし (確認済み) | なし | copy / design / assets | CLAUDE.md のみ | Cloudflare Pages |
| **obsidian-clipper** | TS + Hono / CF Worker | npm (prod/dev 分割) + actions, コメント付き | typecheck (Bun) + gitleaks 3 層 | ruleset (typecheck + gitleaks 必須, squash-only) | なし (HANDOFF.md で vitest 予告) | README 42 KB, HANDOFF.md, ADR なし | CLAUDE.md (不変条件方式) | wrangler deploy |
| **obsidian-tdsl** | TS / Obsidian プラグイン | **なし (完全欠落)** | ほぼ空 | 保護なし (確認済み) | なし | README ja/en, CHANGELOG | **なし** | — |
| **homebrew-tap** | Ruby / tap (public) | actions のみ | brew test-bot (multi-OS) + pr-pull publish | ruleset (削除 / FF 禁止のみ) | test-bot | README ja/en | CLAUDE.md のみ | bottle 配布 |
| **project-hail-mary** | Astro / ガイドサイト (public) | npm + actions, cooldown 5 日 | 1 ジョブ (check + build + preview) | ruleset (PR 必須) | なし | README のみ | フル装備 (symlink CLAUDE.md + agent-memory) | Cloudflare Pages (非 ASCII commit 対応) |

---

## 2. ドナー / 受け手マップ

各プラクティスについて、優れた実装を持つドナーリポジトリと、移植先として優先度の高い受け手リポジトリを示す。

### 2.1 CI ジョブ並列分割 (lint / typecheck / build / E2E)

| 項目 | 内容 |
|---|---|
| **ドナー** | astro-blog |
| **受け手** | reflectorbit-lp, code-tactics-lp, project-hail-mary |
| **参照ファイル** | `keroway/astro-blog/.github/workflows/ci.yml` (冒頭の設計コメントを必ず読む) |
| **要点** | typecheck ジョブ (`astro check`) と build ジョブ (`astro build` 直叩き) を意図的に並列化している。`pnpm run build` (= `astro check && astro build`) を build ジョブで使わないのは設計判断。CI は「ツール経路一致でなくバージョン pin 一致」で整合を取る |

### 2.2 branch 保護 ruleset (削除 / force-push 禁止 + required checks)

| 項目 | 内容 |
|---|---|
| **ドナー** | astro-blog, code-tactics, obsidian-clipper |
| **受け手** | reflectorbit-lp (確認済み保護なし), obsidian-tdsl (確認済み保護なし) |
| **参照ファイル** | `gh api repos/keroway/astro-blog/rulesets` で構成を確認 |
| **要点** | 最小構成は「削除禁止 + force-push 禁止」のみでも有効。required checks は CI が安定してから追加する。timeline-dsl / reflectorbit は 2026-05 に ruleset 設定済み ([timeline-dsl#455](https://github.com/keroway/timeline-dsl/issues/455)) |

### 2.3 Dependabot グループ化 + major block + cooldown

| 項目 | 内容 |
|---|---|
| **ドナー** | code-tactics (グループ化が最良), astro-blog, project-hail-mary (cooldown 5 日) |
| **受け手** | obsidian-tdsl (完全欠落), timeline-dsl-lp (minimal) |
| **参照ファイル** | `keroway/code-tactics/.github/dependabot.yml` |
| **要点** | `groups:` でパッケージをまとめ PR 数を削減。`ignore:` で `update-types: ["version-update:semver-major"]` を指定して major 更新を手動管理に切り出す |

### 2.4 axe-core a11y smoke + Lighthouse CI

| 項目 | 内容 |
|---|---|
| **ドナー** | timeline-dsl-lp |
| **受け手** | astro-blog, 各 LP |
| **参照ファイル** | `keroway/timeline-dsl-lp/.github/workflows/` の smoke ジョブ群, Lighthouse 設定 |
| **要点** | axe-core を Playwright テスト内で実行し a11y 違反を CI で検出。Lighthouse CI は bundle-size 監視と併用すると効果的 |

### 2.5 lychee リンク検証 (内部アンカー含む)

| 項目 | 内容 |
|---|---|
| **ドナー** | code-tactics-lp |
| **受け手** | astro-blog, 各 LP / docs サイト |
| **参照ファイル** | `keroway/code-tactics-lp/lychee.toml`, `.github/workflows/` の linkcheck ジョブ |
| **要点** | 外部リンク切れを CI で検出。内部アンカーも検証できるため docs/ が充実しているリポジトリほど恩恵が大きい |

### 2.6 gitleaks 3 層 secret scan (push / PR / weekly)

| 項目 | 内容 |
|---|---|
| **ドナー** | obsidian-clipper |
| **受け手** | timeline-dsl (public), homebrew-tap |
| **参照ファイル** | `keroway/obsidian-clipper/.github/workflows/gitleaks.yml` |
| **要点** | push フック + PR チェック + weekly スケジュールの 3 層で secret の混入を検出。public repo への適用が特に重要 |

### 2.7 ADR 体系 (docs/adr/ + テンプレート)

| 項目 | 内容 |
|---|---|
| **ドナー** | code-tactics (7 本, template あり), timeline-dsl |
| **受け手** | obsidian-clipper (HANDOFF.md で予告済み), astro-blog (体系化が弱い) |
| **参照ファイル** | `keroway/code-tactics/docs/adr/` (template.md を含む) |
| **要点** | ADR は「過去の判断の文書化」が目的。全決断を記録するのではなく、覆すとコストが高い判断に絞るのが継続のコツ |

### 2.8 Issue / PR テンプレート

| 項目 | 内容 |
|---|---|
| **ドナー** | timeline-dsl, code-tactics, 各 LP |
| **受け手** | astro-blog (issue 側なし), obsidian-clipper, reflectorbit, obsidian-tdsl, homebrew-tap (PR 側) |
| **参照ファイル** | `keroway/timeline-dsl/.github/ISSUE_TEMPLATE/`, `keroway/code-tactics/.github/PULL_REQUEST_TEMPLATE.md` |
| **要点** | bug / feat の 2 テンプレートが最小構成。PR テンプレートは「再現手順」と「スクリーンショット欄」があるだけでレビュー品質が上がる |

### 2.9 `remove-in-progress-on-close.yml` (ラベル自動掃除)

| 項目 | 内容 |
|---|---|
| **ドナー** | timeline-dsl, reflectorbit, timeline-dsl-lp |
| **受け手** | astro-blog (in-progress / in-review 運用と相性よし), code-tactics |
| **参照ファイル** | `keroway/timeline-dsl/.github/workflows/remove-in-progress-on-close.yml` |
| **要点** | Issue / PR close 時に `in-progress` / `in-review` ラベルを自動削除する。ラベル運用を手動で回している場合に腐敗が起きにくくなる |

### 2.10 pnpm サプライチェーン保護 + `packageManager` pin

| 項目 | 内容 |
|---|---|
| **ドナー** | astro-blog (`minimumReleaseAgeStrict` 等), timeline-dsl-lp |
| **受け手** | reflectorbit-lp, code-tactics-lp, project-hail-mary (npm・pin なし) |
| **参照ファイル** | `keroway/astro-blog/pnpm-workspace.yaml`, `keroway/astro-blog/package.json` の `packageManager` フィールド |
| **要点** | `package.json` の `packageManager: pnpm@<version>` で CI / Vercel / ローカルが同じバージョンを取得する。npm 系リポジトリも `packageManager: npm@<version>` の明示だけで再現性が上がる |

### 2.11 リリース自動化 (multi-arch + OIDC trusted publishing + Homebrew formula 自動更新)

| 項目 | 内容 |
|---|---|
| **ドナー** | timeline-dsl |
| **受け手** | code-tactics (Tauri 周りが未自動化) |
| **参照ファイル** | `keroway/timeline-dsl/.github/workflows/release.yml` |
| **要点** | crates.io / npm への publish は OIDC で行い、secrets を持たない。Homebrew formula の自動更新は `homebrew-tap` との連携で実現 |

### 2.12 .claude/ フル装備 (agents / rules / hooks / commands / agent-memory)

| 項目 | 内容 |
|---|---|
| **ドナー** | astro-blog, project-hail-mary, reflectorbit, timeline-dsl |
| **受け手** | obsidian-clipper, homebrew-tap, obsidian-tdsl |
| **参照ファイル** | `keroway/astro-blog/.claude/` (rules / hooks / commands のディレクトリ構成) |
| **要点** | hooks の `format-on-write.sh` (PostToolUse) と `stop-dev-server.sh` (SessionEnd) はコピーして使い回せる。SessionEnd hook は settings.json に手動登録が必要 (エージェント自己改変ガード) |

### 2.13 Cloudflare Pages 非 ASCII コミットメッセージ対応

| 項目 | 内容 |
|---|---|
| **ドナー** | project-hail-mary |
| **受け手** | 各 Cloudflare Pages デプロイリポジトリ (reflectorbit-lp, code-tactics-lp, timeline-dsl-lp など) |
| **参照ファイル** | `keroway/project-hail-mary/.github/workflows/deploy.yml` |
| **要点** | `wrangler pages deploy` の `--commit-hash` / `--commit-message` に `$GITHUB_SHA` / `"Deploy $GITHUB_SHA"` を明示することで、日本語コミットメッセージを含む場合のデプロイ失敗を回避する |

---

## 3. 設計パターンの記録

### 3.1 CLAUDE.md「壊すと何が破綻するか」不変条件方式

**ドナー:** obsidian-clipper, code-tactics

CLAUDE.md には「何をすべきか」の手順よりも「これを壊すと何が破綻するか」という不変条件を書く方式。エージェントが変更前にリスクを把握しやすくなり、意図しない副作用が減る。

```
# 不変条件

- X を変更すると Y が壊れる
- A と B は常に同期していなければならない
```

### 3.2 CI は「ツール経路一致でなくバージョン pin 一致」

**ドナー:** astro-blog (PR #44 の教訓, ADR に記録)

CI (GitHub Actions) と本番 (Vercel) でツールの呼び出し経路 (pnpm/action-setup vs corepack) を揃えようとすると、corepack の署名検証エラーなどに当たることがある。経路の一致ではなく `package.json` の `packageManager` フィールドによるバージョン pin で整合を取るのが正解。

### 3.3 傘 Issue + 個別 Issue による展開方式

横断的な改善をロールアウトするとき、大きな傘 Issue 1 本でチェックリストを管理し、大物のみ個別 Issue に切り出す方式。利点:

- 全体の進捗が傘 Issue 1 箇所で見渡せる
- 個別 Issue は実施者がアサイン・ラベル管理できる単位に分割される
- 傘 Issue を close しないまま個別 Issue を順次 close していける

---

## 4. 更新方法

新たな横断調査を実施したら、本ドキュメントをそのまま上書きしてください。差分管理は git 履歴に委ねます。

調査のたびに更新日 (`> **注意: YYYY-MM-DD 時点のスナップショットです。**`) を最新日付に書き換えてください。
