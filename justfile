# keroway 標準 justfile（package.json scripts への薄い委譲のみ）。
# 詳細なタスクは CLAUDE.md / package.json を参照。

default:
    @just --list

build:
    pnpm run build

test:
    pnpm run test:unit

lint:
    pnpm run lint

format:
    pnpm run format

# CI の lint / typecheck / unit test ジョブと同じ検査をまとめて実行（コミット前の全通し確認）
check:
    pnpm run lint
    pnpm run lint:alt
    pnpm run lint:tokens-doc
    pnpm exec astro check
    pnpm run test:unit
