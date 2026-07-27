# astro-blog — Claude Code Setup

このディレクトリは Claude Code / Cursor 等の AI コーディングエージェントの動作をこのプロジェクト用に
整える共有設定です。`CLAUDE.md`（リポジトリルート）と一緒に読んでください。

## 構成

```
.claude/
├── agents/
│   ├── web-designer.md        # UI/UX 改善・新規ページ設計担当
│   ├── web-director.md        # 要件/アーキテクチャ判断、スコープ管理担当
│   └── literary-tech-editor.md # 記事の技術層/論理層/情緒層の推敲担当
├── commands/
│   ├── ship-check.md          # /ship-check スラッシュコマンド
│   └── fix-ci.md              # /fix-ci スラッシュコマンド
├── rules/
│   └── implementation.md      # スコープ管理・Astro 7 固有の罠・検証順序などの詳細ルール
├── hooks/
│   ├── format-on-write.sh     # PostToolUse: 編集ファイルの自動 Biome format
│   ├── post-stop-check.sh     # Stop: 変更範囲に応じた lint/typecheck/unit test
│   └── stop-dev-server.sh     # SessionEnd: 立ち上げた astro dev の停止
├── settings.json              # 共有設定（hook 登録・許可プラグイン等、コミット対象）
├── settings.local.json        # 個人設定（.gitignore で除外）
└── agent-memory/              # エージェントの観察ログ（.gitignore で除外）
```

## 依存ツール

| ツール | 用途 | 必須？ |
|---|---|---|
| `pnpm` | ビルド・lint・test の実行 | 必須（hook が PATH を要求、無いと Stop hook が exit 2 で通知） |
| `jq` | hook 内 JSON 抽出 | 無い環境では非依存フォールバックで動作 |

## Hooks の挙動

### PostToolUse: `format-on-write.sh`

- 発火条件: `Edit` / `Write` / `MultiEdit` が `.ts/.tsx/.js/.jsx/.mjs/.cjs/.json` を編集したとき（`.astro` / `.md` / `.css` は対象外）
- 動作: 対象ファイルに Biome format を適用
- 失敗時: 標準的な PostToolUse としてフィードバック

### Stop: `post-stop-check.sh`

- 発火条件: Claude が応答を終えたとき（変更ファイルが無ければ即終了）
- 動作: 変更ファイル（uncommitted + untracked + 未 push commit）を分類し、影響がある領域だけ CI と同じコマンドを実行
  - コード/コンテンツ変更 → `biome ci` + `astro check`
  - `src/content/**` の md/mdoc 変更 → `lint:alt`
  - TS/テスト変更 → `vitest`
- 失敗時: exit 2 で Claude にフィードバック（ブロッキング）
- pnpm が見つからない等「検証できない」場合も exit 2（silent-pass しない）
- 一時的に止めたい場合: `BLOG_SKIP_STOP_HOOK=1`

### SessionEnd: `stop-dev-server.sh`

- 発火条件: セッション終了時
- 動作: セッション中に立ち上げた `astro dev` を cwd スコープで停止（共有 portless proxy デーモンは残す）

## Slash Commands

### `/ship-check [pw filter]`

CI のうちローカル再現可能な5ジョブ（lint / unit / typecheck / build / playwright）と同じコマンドを順次実行する PR 直前ゲート。

### `/fix-ci <PR番号>`

指定 PR の落ちた CI ログを `gh` で取得して修正に当たる（PR 番号は必ず明示）。

## Agents の役割分担

| Agent | 担当領域 |
|---|---|
| `web-designer` | UI/UX 改善・新規ページ設計（`docs/design-system.md` 準拠、Playwright MCP でスクリーンショット比較可） |
| `web-director` | 要件/アーキテクチャ判断、PR スコープ管理、ADR 起票判断 |
| `literary-tech-editor` | 記事の技術層/論理層/情緒層の三層推敲、トーン調整 |

## Rules の参照階層

`CLAUDE.md`（最上位） → `.claude/rules/implementation.md`（詳細）の順で参照。矛盾があれば `CLAUDE.md` が優先。

## 他環境への移植

このディレクトリは macOS / Linux いずれでも動作するように書かれています:

- hook スクリプトは `#!/usr/bin/env bash`
- 絶対パスは `$CLAUDE_PROJECT_DIR` で解決する
- `.claude/agent-memory/` は `.gitignore` で除外（個人のメモ）

新しい開発者がリポジトリをクローンした場合、追加でやることはありません。Claude Code が
`settings.json` を読み込めば hook が有効になります。
