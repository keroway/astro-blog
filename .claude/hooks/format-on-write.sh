#!/usr/bin/env bash
# PostToolUse hook for Edit / Write / MultiEdit.
# Auto-format the touched file with Biome when the extension matches.
#
# Reads the hook payload (JSON) from stdin, extracts tool_input.file_path,
# and runs `pnpm exec biome format --write <file>` on supported extensions.
# Fails silently — formatting must never block the agent's main loop.
set -u

# Project root: this script lives in .claude/hooks/, so go up two levels.
PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Read full stdin once. jq might not be available, so fall back through
# python3, then sed (see reflectorbit/.claude/hooks/fmt-zig.sh for the
# reference implementation of this fallback chain).
payload="$(cat || true)"
[ -z "$payload" ] && exit 0

if command -v jq >/dev/null 2>&1; then
  file="$(printf '%s' "$payload" | jq -r '.tool_input.file_path // empty' 2>/dev/null)"
elif command -v python3 >/dev/null 2>&1; then
  file="$(printf '%s' "$payload" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
    print(d.get("tool_input", {}).get("file_path", ""))
except Exception:
    pass
' 2>/dev/null)"
else
  # Minimal fallback: extract file_path with sed. Good enough for typical payloads.
  file="$(printf '%s' "$payload" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)"
fi

[ -z "$file" ] && exit 0
[ ! -f "$file" ] && exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.jsonc)
    cd "$PROJECT_ROOT" || exit 0
    # --no-errors-on-unmatched: silently skip files Biome doesn't manage (e.g. ignored).
    pnpm exec biome format --write --no-errors-on-unmatched "$file" >/dev/null 2>&1 || true
    ;;
  *)
    # .astro, .md, .mdx, .css are not formatted by Biome — skip.
    ;;
esac

exit 0
