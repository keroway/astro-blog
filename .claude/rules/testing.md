---
paths:
  - "tests/**"
  - "src/lib/**"
  - "src/scripts/**"
  - "vitest.config.ts"
  - "playwright.config.ts"
---

# テストのルール

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。CI 全体の構成は CLAUDE.md 「Testing & Type Safety」節を参照。

- **Unit tests:** `pnpm run test:unit` (vitest)。対象は `vitest.config.ts` の `include` を正とする (`src/lib/**`・`src/scripts/**`・`tests/**`・`scripts/**` 配下の `*.test.ts`。ここに個別ファイル名は列挙しない)。`astro:content` は `src/lib/__mocks__/astro-content.ts` でスタブ (`vitest.config.ts`)
- **E2E tests:** Playwright tests in `tests/playwright/*.spec.ts` (一覧は `ls tests/playwright` を正とし、ここには列挙しない。#675 で直した直後に再びずれたため個数・名前の直書きをやめた)
  - Run with: `ASTRO_DEV_BACKGROUND=0 pnpm run test:e2e` (CI と同じ `CRON_SECRET=ci-test-secret` をセットする正規経路。素の `pnpm exec playwright test` だと url-check の 401 テスト 3 件が落ちる)
  - Projects: chromium / firefox / mobile-chromium (Pixel 5)
  - ポートはローカルでは **空きポートを自動採番**する (`playwright.config.ts` 冒頭が `PLAYWRIGHT_PORT` / `DEPLOY_HOOK_PORT` を `process.env` に書き戻し、worker が継承する)。複数の worktree / エージェントが並走しても衝突しない。明示したいときは `PLAYWRIGHT_PORT` (→ `PORT`) / `DEPLOY_HOOK_PORT` を指定する (`PLAYWRIGHT_HOST` / `HOST` も同様)。`CI` 設定時は従来どおり固定 (`4335` / `4336`) で、`test:admin` も `CI=1` + `PLAYWRIGHT_PORT=4335` の固定。自動採番では起動中の dev サーバーを再利用しないので、再利用したいときは `PLAYWRIGHT_PORT` で明示する。
- **alt テキスト lint:** `pnpm run lint:alt` で `src/content/{blog,works}/**/*.{md,mdoc}` 内の markdown 画像を走査し、alt が空または 4 文字未満の箇所を検出する (`scripts/lint-alt.ts`)。CI の `lint` ジョブで Biome lint と並んで自動実行され、退行を検知する。
