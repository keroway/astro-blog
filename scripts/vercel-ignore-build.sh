#!/bin/sh
# Vercel Ignored Build Step (vercel.json の ignoreCommand から呼ばれる)。
# install 前に走るため純粋な POSIX sh のみで書く (node_modules 未展開)。
# exit 0 = ビルドをスキップ、exit 1 = ビルドを継続 (Vercelの仕様)。
#
# renovate/* ブランチの push (Renovateのrebase含む) は依存更新のみで
# CI (lint/typecheck/build/e2e) が別途検証するため、preview デプロイを間引く。
# デプロイメントストレージの無料枠超過対策 (2026-09)。
case "$VERCEL_GIT_COMMIT_REF" in
  renovate/*)
    echo "renovate/* ブランチのため preview デプロイをスキップします: $VERCEL_GIT_COMMIT_REF"
    exit 0
    ;;
  *)
    exit 1
    ;;
esac
