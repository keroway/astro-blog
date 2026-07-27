# astro-blog セキュリティ指針

## Agent SDK はランタイムに載せない（ADR 0008）

`@anthropic-ai/claude-agent-sdk` は管理者向け記事作成補助のための **devDependency** で、
`scripts/` 配下のローカル CLI に限定する。公開サイトのランタイム（`dist/` のビルド成果物・
Vercel Function・クライアント JS）には絶対に含めない。認証は個人サブスクの月間クレジット
経路（管理者のログイン済み Claude Code 認証、または GH Actions 化する場合は
`CLAUDE_CODE_OAUTH_TOKEN`）に限定し、API キー直課金はしない。

## 環境変数

このリポジトリは public のため `.env` を常駐させない（#599）。ローカル開発・E2E は
env ファイルなしで動く。実値検証が必要なときのみ一時取得し、確認後は削除する。
