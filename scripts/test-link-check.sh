#!/usr/bin/env bash
# lychee のリンク検査設定の回帰テスト (#878)。
#
# 本番同一ホストの絶対 URL (https://keroway.com/...) を exclude で一律に落とすと、存在しない
# ページ・アンカーへの絶対 URL が素通りする。lychee の --remap で生成済み dist の
# file:// に写像して検証する構成を、fixture で固定する:
#   ok/                   → 成功 (絶対/相対のページ・アンカー、canonical)
#   bad-abs-page/         → 失敗 (存在しないページへの絶対 URL)
#   bad-abs-anchor/       → 失敗 (存在しないアンカーへの絶対 URL)
#   bad-rel-page/         → 失敗 (存在しないページへの相対 URL)
#   bad-rel-anchor/       → 失敗 (存在しないアンカーへの相対 URL)
#
# lychee の引数は package.json の test:links と .github/workflows/ci.yml の
# Link check ステップに合わせる。変更時は 3 箇所を揃えること。
set -euo pipefail

cd "$(dirname "$0")/.."
fixtures="$PWD/tests/fixtures/link-check"
status=0

run_lychee() {
  local root="$1"
  lychee --no-progress \
    --include-fragments \
    --root-dir "$root" \
    --fallback-extensions html \
    --index-files index.html \
    --remap "^https://keroway\\.com/ file://$root/" \
    "$root/**/*.html" 2>&1
}

for expect in ok bad-abs-page bad-abs-anchor bad-rel-page bad-rel-anchor; do
  root="$fixtures/$expect/client"
  if output="$(run_lychee "$root")"; then result=pass; else result=fail; fi
  case "$expect" in
    ok)
      # 成功が期待のケースは、通ったことだけでなく 0 エラーであることまで見る
      if [ "$result" = pass ]; then good=1; else good=0; fi ;;
    *)
      # 失敗が期待のケースは、引数ミス等ではなく「リンク切れ」で落ちたことを確認する
      if [ "$result" = fail ] && printf '%s' "$output" | grep -qE 'File not found|Cannot find fragment'; then good=1; else good=0; fi ;;
  esac
  if [ "$good" = 1 ]; then
    echo "ok   $expect (lychee: $result)"
  else
    echo "FAIL $expect (lychee: $result)"
    printf '%s\n' "$output" | tail -5
    status=1
  fi
done

exit "$status"
