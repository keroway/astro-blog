---
description: PR を投げる前に走らせる総合チェック (lint / typecheck / build / playwright)。失敗したジョブだけ深掘りして直す。
---

PR 直前の品質ゲートを順に実行する。各ステップが**直前のステップが緑であることを前提に**進む。途中で落ちたらそこで止めて原因を直してからリトライすること。

## 手順

CI 4 ジョブ (lint / typecheck / build / test) と同じコマンドを順に走らせる。CI の build ジョブは意図的に `astro check` を含まない (典型的な `astro check && astro build` ではなく `astro build` 直叩き、`typecheck` ジョブで `astro check` をカバーする並列構成) — それに合わせる。

1. **lint** (CI `lint` ジョブ相当: `biome ci`)

   ```bash
   pnpm run lint
   ```

2. **typecheck** (CI `typecheck` ジョブ相当)

   ```bash
   pnpm exec astro check
   ```

3. **build** (CI `build` ジョブ相当 — `pnpm run build` ではなく `astro build` を直叩きするのが意図)

   ```bash
   pnpm exec astro build
   ```

4. **E2E (Playwright)** — 4321 が空いていない場合は `PLAYWRIGHT_PORT=4322` などで明示

   ```bash
   pnpm exec playwright test
   ```

## 失敗時の対応ルール

- **lint 落ち:** まず安全な自動修正だけ試す: `pnpm exec biome check --write .`。`--unsafe` は付けない (挙動を変えうるため、要件が明確なときだけ手動で評価)。残った警告は手で直す。
- **typecheck 落ち:** ファイルと行を特定して該当箇所を読み、型の問題を直す。`as` での誤魔化しは避ける。
- **build 落ち:** Content Collections schema (`src/content.config.ts`) のバリデーションエラーが多い。落ちたエントリの frontmatter を確認する。
- **Playwright 落ち:**
  - ポート競合の可能性を最初に確認 (`lsof -iTCP:4321 -sTCP:LISTEN`)。占有されていれば `PLAYWRIGHT_PORT=4322 pnpm exec playwright test`。
  - 失敗トレースは `test-results/` 配下を見る。スクリーンショットと video が残る。
  - 環境固有のフレークなら再実行。実装ミスならテストではなく実装を直す。

## 完了判定

4 ステップすべてが緑になったら「ship-check passed」と報告し、`git status` を 1 行で添えて報告を終える。テストや lint を**スキップして OK と言うのは禁止**。落ちたら必ず止まる。

## 引数

`$ARGUMENTS` を受け取った場合は、それを特定のテストに絞るためのフィルタとして 4 番ステップ (Playwright) に渡す:

```bash
pnpm exec playwright test $ARGUMENTS
```

引数なしのときは全体を回す。
