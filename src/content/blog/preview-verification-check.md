---
title: "Preview Verification Check"
description: "Issue #100 の検証用 draft 記事。Vercel Preview Deployment と draft フィルタの挙動確認に使う。マージ前に必ず削除する。"
pubDate: 2026-05-23
draft: true
category: "internal"
tags: ["internal", "verification"]
---

This file is a temporary fixture for **Issue #100** ([Vercel Preview Deployment と CMS の連携を検証する](https://github.com/keroway/astro-blog/issues/100)).

Its purpose is to confirm:

1. `draft: true` の記事が本番ビルドで除外されること (`/blog/preview-verification-check/` が 404 になる)
2. Vercel Preview Deployment 上でも同じフィルタが効くこと
3. Preview URL は記事ページのプレビュー用途として機能すること

**この記事は同 PR の最終コミットで削除されます。main にマージされてはいけません。**
