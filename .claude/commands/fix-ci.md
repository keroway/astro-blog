---
description: 指定した PR の落ちた CI ログを gh で取得し、原因を特定して修正する。使い方は /fix-ci <PR番号>。
argument-hint: <PR番号>
---

PR 番号: `$ARGUMENTS`

引数が空、または数値でなければ「`/fix-ci <PR番号>` の形式で呼び出して」と返してそこで終わる。**現在のブランチから推測しない** (誤爆防止)。

## 手順

1. **PR のメタ情報を取得**

   ```bash
   gh pr view $ARGUMENTS --json number,title,headRefName,baseRefName,state,url,statusCheckRollup
   ```

   - `state` が `OPEN` 以外なら「PR が閉じている / マージ済み」を理由に終了する。
   - `headRefName` を控える (チェックアウト用)。

2. **失敗したチェックを抽出**

   ```bash
   gh pr checks $ARGUMENTS --required --watch=false
   ```

   - `pass` / `pending` を除いて、`fail` のジョブを列挙する。
   - すべて緑なら「失敗チェックなし」と報告して終わる。

3. **ブランチをチェックアウト**

   現在のブランチが PR のヘッドと異なる場合のみ:

   ```bash
   git fetch origin
   git switch <headRefName>
   git pull --ff-only
   ```

   未コミットの差分があるときは勝手に stash しない。状況をユーザーに伝えて指示を仰ぐ。

4. **失敗ジョブのログを取得**

   それぞれの失敗ジョブについて:

   ```bash
   gh run view <run-id> --log-failed --job <job-id>
   ```

   `gh pr checks` の出力からは run-id / job-id を直接拾えないので、必要なら:

   ```bash
   gh run list --branch <headRefName> --workflow ci.yml --limit 5 --json databaseId,status,conclusion,headSha,workflowName,event
   ```

   から最新失敗 run を選び、`gh run view <id> --log-failed` で当たる。

5. **原因を要約してから手を動かす**

   修正に入る前に必ず以下を 1 メッセージで報告する:

   - 落ちたジョブ名と失敗ステップ (例: `Lint` の `Run Biome lint`)
   - エラーの抜粋 (10 行以内)
   - 推定原因 (型エラー / lint 違反 / schema 違反 / Playwright のセレクタ ずれ / ポート競合 / 環境差異 など)
   - 修正方針 (どのファイルをどう直すか)

6. **修正してローカルで再現確認**

   修正後、同じチェックがローカルで通ることを必ず確認:

   - lint 落ち → `pnpm run lint`
   - typecheck 落ち → `pnpm exec astro check`
   - build 落ち → `pnpm exec astro build`
   - Playwright 落ち → `pnpm exec playwright test <該当ファイル>` (ポート競合に注意)

7. **コミット & プッシュ**

   - コミットメッセージは「何を直したか」を短い imperative で。例: `fix(ci): Biome lint の no-unused-imports に対応`
   - **プッシュは確認を取ってから。** ユーザーに「この差分でプッシュしてよいか」を 1 回確認する。

## 厳守

- **CI を skip する変更 (テストを `.skip` する、lint ルールを緩める、astro check を build から外す) は禁止。** 例外を出す必要があるなら理由を述べてユーザー判断を仰ぐ。
- 原因が分からないままコミットしない。再現できなければそう報告する。
- 1 度の試行で直らないときは、ループに入る前に状況をユーザーに伝えて方針を確認する。
