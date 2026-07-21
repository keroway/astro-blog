---
description: PR を投げる前に走らせる総合チェック (lint / unit / typecheck / build / playwright)。失敗したジョブだけ深掘りして直す。
---

PR 直前の品質ゲートを順に実行する。各ステップが**直前のステップが緑であることを前提に**進む。途中で落ちたらそこで止めて原因を直してからリトライすること。

## 手順

CI 7 ジョブのうちローカル再現可能な 5 つ (lint / unit / typecheck / build / test) と同じコマンドを順に走らせる (Lighthouse / Link check は CI のみ)。CI の build ジョブは意図的に `astro check` を含まない (典型的な `astro check && astro build` ではなく `astro build` 直叩き、`typecheck` ジョブで `astro check` をカバーする並列構成) — それに合わせる。

1. **lint** (CI `lint` ジョブ相当: `biome ci` + alt テキスト lint)

   ```bash
   pnpm run lint
   pnpm run lint:alt
   ```

2. **unit** (CI `unit` ジョブ相当: vitest)

   ```bash
   pnpm run test:unit
   ```

3. **typecheck** (CI `typecheck` ジョブ相当)

   ```bash
   pnpm exec astro check
   ```

4. **build** (CI `build` ジョブ相当 — `pnpm run build` ではなく `astro build` を直叩きするのが意図)

   ```bash
   pnpm exec astro build
   ```

5. **E2E (Playwright)** — `test:e2e` は CI と同じ `CRON_SECRET` をセットする。`ASTRO_DEV_BACKGROUND=0` は Astro 7 の dev 自動 background 化 (AI エージェント検出時) のオプトアウトで、付けないと webServer が早期終了扱いで落ちる。デフォルトポートは 4335、競合時は `PLAYWRIGHT_PORT` で明示

   ```bash
   ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e
   ```

## 失敗時の対応ルール

- **lint 落ち:** まず安全な自動修正だけ試す: `pnpm exec biome check --write .`。`--unsafe` は付けない (挙動を変えうるため、要件が明確なときだけ手動で評価)。残った警告は手で直す。
- **unit 落ち:** `src/lib/**/*.test.ts` / `tests/**/*.test.ts` の失敗ケースを読み、実装かテストの期待値かを切り分けて直す。
- **typecheck 落ち:** ファイルと行を特定して該当箇所を読み、型の問題を直す。`as` での誤魔化しは避ける。
- **build 落ち:** Content Collections schema (`src/content.config.ts`) のバリデーションエラーが多い。落ちたエントリの frontmatter を確認する。
- **Playwright 落ち:**
  - ポート競合の可能性を最初に確認 (`lsof -iTCP:4335 -sTCP:LISTEN`)。占有されていれば `PLAYWRIGHT_PORT=4336 ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e` のようにポートを変える。残留 dev デーモンは `pnpm exec astro dev status` / `astro dev stop`。
  - 失敗トレースは `test-results/` 配下を見る。スクリーンショットと video が残る。
  - 環境固有のフレークなら再実行。実装ミスならテストではなく実装を直す。

## 完了判定

5 ステップすべてが緑になったら「ship-check passed」と報告し、`git status` を 1 行で添えて報告を終える。テストや lint を**スキップして OK と言うのは禁止**。落ちたら必ず止まる。

## 引数

`$ARGUMENTS` を受け取った場合は、それを特定のテストに絞るためのフィルタとして 5 番ステップ (Playwright) に渡す:

```bash
ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e $ARGUMENTS
```

引数なしのときは全体を回す。
