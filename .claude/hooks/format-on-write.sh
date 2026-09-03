#!/usr/bin/env bash
# PostToolUse hook for Edit / Write / MultiEdit.
# Auto-format the touched file with Biome when the extension matches.
#
# Based on agent-assets/templates/format-on-write.sh (#697): keep the repo
# boundary / generated-dir guards and the jq → python3 → sed fallback chain.
# Formatting is best-effort only — it must always exit 0 so an unavailable
# formatter never blocks the agent's main loop.
set -u

# Prefer the project dir Claude Code hands us; fall back to the script location
# (.claude/hooks/ → two levels up).
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

payload="$(cat || true)"
[ -z "$payload" ] && exit 0

# jq is optional, python3 is commonly available, sed works in minimal shells.
extract_file_path() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$1" | jq -r '.tool_input.file_path // empty' 2>/dev/null
    return
  fi
  if command -v python3 >/dev/null 2>&1; then
    printf '%s' "$1" | python3 -c 'import json,sys
try: print(json.load(sys.stdin).get("tool_input", {}).get("file_path", ""))
except Exception: pass' 2>/dev/null
    return
  fi
  printf '%s' "$1" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1
}

file="$(extract_file_path "$payload")"
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

# Do not format files outside this repository or generated/vendor directories.
case "$file" in
  "${PROJECT_ROOT}"/*) ;;
  *) exit 0 ;;
esac
case "$file" in
  */node_modules/*|*/dist/*|*/build/*|*/.git/*|*/.astro/*|*/.vercel/*) exit 0 ;;
esac

# Extensions must match biome.json `files.includes` (ts / js / mjs / json).
# .astro / .md / .mdoc / .css are not formatted by Biome — skip.
case "$file" in
  *.ts|*.js|*.mjs|*.json)
    cd "$PROJECT_ROOT" || exit 0
    # --no-errors-on-unmatched: silently skip files Biome doesn't manage (e.g. ignored).
    pnpm exec biome format --write --no-errors-on-unmatched "$file" >/dev/null 2>&1 || true
    ;;
esac

exit 0
