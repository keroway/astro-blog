#!/usr/bin/env bash
# SessionEnd hook — セッション中に立ち上げた dev サーバーを終了し、立ちっぱなしを防ぐ。
#
# 対象: このプロジェクトの cwd で動く Astro dev サーバー本体 (astro.mjs dev) と、
#       それを包む portless run ラッパー。
# 非対象:
#   - 別プロジェクトの astro プロセス (cwd で限定して巻き込まない)
#   - 共有の portless proxy デーモン (port 443)。プロジェクト横断の長命ルーターで、
#     再起動には sudo が要るため意図的に残す ("portless run" のみ一致させ proxy は除外)。
#
# 実プロセスのコマンドラインは "astro.mjs dev" であって "astro dev" ではない点に注意
# (素朴な pkill -f "astro dev" だと本体を取り逃す)。
#
# SessionEnd hook は blocking 不可・終了コード無視のため、後始末に徹して必ず exit 0。
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# astro dev 本体 / portless run ラッパーのうち、cwd が本プロジェクト配下のものだけ止める。
for pid in $(pgrep -f "astro\.mjs dev|portless run" 2>/dev/null); do
  cwd=$(lsof -a -d cwd -Fn -p "$pid" 2>/dev/null | sed -n 's/^n//p' | head -1)
  case "$cwd" in
    "$PROJECT_DIR" | "$PROJECT_DIR"/*)
      kill "$pid" 2>/dev/null || true
      ;;
  esac
done

# 後詰め: portless が孤児として把握している dev サーバーを掃除する (proxy は止めない)。
PORTLESS_BIN="${PROJECT_DIR}/node_modules/.bin/portless"
if [ -x "$PORTLESS_BIN" ]; then
  "$PORTLESS_BIN" prune --force >/dev/null 2>&1 || true
fi

exit 0
