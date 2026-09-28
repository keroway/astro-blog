---
paths:
  - "src/content/**"
  - "src/content.config.ts"
  - "src/lib/content-schema.ts"
---

# Content Collections ルール

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。

## Content Collections Schema

Blog posts in `src/content/blog/` must include this frontmatter:

```yaml
---
title: "Article Title"              # Required
description: "Short summary"        # Required
pubDate: 2024-01-15                # Required (coerced to Date)
updatedDate: 2024-01-20            # Optional
category: "Cloud & DevOps"         # Optional (BLOG_CATEGORIES の enum、src/lib/content-schema.ts)
tags: ["astro", "vercel"]          # Optional (string[])
series: "シリーズ名"                # Optional
heroImage: ../../assets/content/blog/xxx.png  # Optional (image()、ローカルアセット参照)
ogImage: "/og/custom.png"          # Optional
author: "keroway"                  # Optional
canonicalUrl: "https://..."        # Optional (URL)
draft: true                        # Optional (default false、true で非公開)
---
```

Schema is defined in `src/content.config.ts` using Zod (imported from `astro/zod`); category / status の enum は `src/lib/content-schema.ts` に定義。New fields require schema updates.

Works entries in `src/content/works/` use a separate collection with:

```yaml
---
title: "Project Name"                   # Required
description: "Short summary"            # Required
status: "active"                        # Required: active | archived | wip (WORKS_STATUSES)
lpUrl: "https://..."                    # Required: landing page / external intro
repoUrl: "https://github.com/..."       # Optional
demoUrl: "https://..."                  # Optional
heroImage: ../../assets/content/works/xxx.png  # Optional (image())
tags: ["Astro", "TypeScript"]           # Required
createdAt: 2026-05-10                   # Required (coerced to Date)
updatedAt: 2026-05-10                   # Optional
featured: true                          # Optional, defaults to false
---
```

`works` entries should focus on background, design decisions, and lessons learned. Use `lpUrl` for feature-focused landing pages and `repoUrl` as the primary implementation reference.

## 新しいブログ記事の追加

1. `pnpm run new-post "タイトル"` を実行する (ASCII タイトルは自動 slug 生成、日本語は `--slug` で指定)
   - `pnpm run new-post "My Article"` → `src/content/blog/my-article.mdoc` (draft: true)
   - `pnpm run new-post "日本語の記事" --slug my-article` → slug を手動指定
   - `--suggest` フラグで作成後に `suggest-frontmatter` を実行し description/tags/category 候補を表示
2. `description`・`category`・`tags` を frontmatter に追記する
3. `pnpm run dev` で表示を確認する
4. `pnpm run build` でスキーマエラーを検出する

## frontmatter 候補の提示 (Claude Code login required)

```bash
pnpm run suggest-frontmatter src/content/blog/<filename>.mdoc
```
`description` / `tags` / `category` の候補を表示するだけで、ファイルは書き換えない。

## Content Collections スキーマの変更

1. `src/content.config.ts` を更新する
2. 既存記事が新スキーマに適合しているか確認する
3. `pnpm run build` で検証する
