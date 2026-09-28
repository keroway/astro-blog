---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "vercel.json"
  - "playwright.config.ts"
  - "astro.config.mjs"
---

# 開発環境まわりの詳細

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。

**Astro 7 の dev 自動 background 化:** Astro 7 は AI コーディングエージェントを検出すると `astro dev` を自動でデタッチした background プロセスとして起動する (lock file: `.astro/dev.json`)。Playwright の webServer がこれを「早期終了」と誤認して落ちるため、エージェントセッションからの E2E 実行は `ASTRO_DEV_BACKGROUND=0` を付ける。残留デーモンは `pnpm exec astro dev status` / `astro dev stop` で確認・停止。

**Dev サーバー (portless):** `pnpm dev` / `pnpm start` は [portless](https://github.com/vercel-labs/portless) 経由で `astro dev` を起動し、固定ポート 4321 ではなく `https://keroway.localhost` で配信する (内部はランダムポート割当でポート競合が消える)。HTTPS 構成のため**初回のみ** CA 信頼登録と 443 バインドで sudo 昇格が走る (`portless trust` / proxy 起動)。proxy は port 443 の常駐デーモンで、プロジェクト横断の共有ルーター。セッション終了時の停止は SessionEnd hook (`.claude/README.md` 参照) が担い、`astro dev` 本体だけを止めて proxy は残す。portless を使わず素の `astro dev` を 4321 で動かしたいときは `pnpm dev:astro`。

**環境変数 (`.env` を常駐させない):** このリポジトリは public のため、ローカルに平文の `.env` を置き続ける運用は #599 でやめた。`pnpm run dev` / `pnpm run test:e2e` はどちらも env ファイルなしで動く (`CRON_SECRET` 未設定時は dev で認証スキップ、`test:e2e` は自前で `CRON_SECRET=ci-test-secret` をセットする)。`/api/trigger-build` を実値で検証したいときだけ `pnpm dlx vercel@latest env pull .env.local --environment=development` で都度取得し、確認後は `rm .env.local` で削除する。詳細は `docs/vercel-preview.md` §3。

**pnpm / サプライチェーン設定:** `pnpm-workspace.yaml` で `esbuild` / `sharp` の build スクリプトは `allowBuilds: false` (v10 までの `ignoredBuiltDependencies` 相当) で無効化。`overrides` / `peerDependencyRules` も pnpm 11 の正規場所として `pnpm-workspace.yaml` に集約 (v10 までは `package.json#pnpm` 配下)。pnpm 11 のサプライチェーン保護 (`strictDepBuilds=true`, `blockExoticSubdeps=true`) はデフォルト有効。`minimumReleaseAge` はデフォルトの 1440 (1 日) からワークスペース共通の 4320 (3 日) に明示的に上書きし (agent-assets#171)、`minimumReleaseAgeStrict: true` も設定済み。`allowBuilds` は `esbuild` / `sharp` が false、`lefthook` (postinstall で hook 同期) だけ true。`.npmrc` はリポジトリに置かない (npmmirror を指す `.npmrc` を同梱していた時期があり、CI / Vercel / Dependabot まで第三者ミラー経由で解決していたため #695 で撤去し gitignore 化)。制約のある環境では `npm_config_registry` / `COREPACK_NPM_REGISTRY` を環境変数で与える。
