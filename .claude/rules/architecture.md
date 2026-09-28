---
paths:
  - "src/**"
---

# ディレクトリ構成の詳細

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。

```
src/
├── assets/content/       # blog / works 用の画像アセット (astro:assets 経由)
├── components/           # 再利用 UI (`*.astro`。個数は列挙しない): BaseHead, Header, Footer, SectionHead,
│                         #   FocusCard, PostRow, WorksCard, TableOfContents, A11yMenu,
│                         #   BlogSearch, CommandPalette, HeroBackdrop ほか
├── content/
│   ├── blog/            # Markdown/Markdoc blog posts
│   └── works/           # Markdown/Markdoc entries for portfolio/projects
├── content.config.ts    # Content Collections schema for blog / works
├── data/                # focus-areas.ts などの静的データ
├── layouts/
│   ├── SiteLayout.astro       # Main page wrapper with Header/Footer
│   ├── BlogPost.astro         # Blog post layout with image optimization
│   └── WorkEntryLayout.astro  # Works entry layout
├── lib/                 # content.ts / content-schema.ts / slug.ts (+ 各 *.test.ts)
├── pages/
│   ├── index.astro            # Homepage (hero, recent posts, focus areas)
│   ├── about.astro / now.astro / colophon.astro / 404.astro
│   ├── admin.astro            # Sveltia CMS (/admin)
│   ├── api/trigger-build.ts   # 公開予約ビルドの on-demand エンドポイント
│   ├── blog/
│   │   ├── [...page].astro    # Blog listing (ページネーション付きカードグリッド)
│   │   ├── [...slug].astro    # Dynamic blog post routes
│   │   ├── category/          # [category].astro
│   │   └── tags/              # index.astro / [tag].astro
│   ├── og/[...slug].png.ts    # OGP 画像生成 (satori + resvg)
│   ├── works/                 # index.astro / [slug].astro / rss.xml.js
│   ├── rss.xml.js / feed.xml.js / llms.txt.ts
├── scripts/             # クライアント JS (font-size, reduce-motion など)
├── styles/
│   ├── tokens.css       # `--kw-*` デザイントークン
│   └── global.css       # ベース要素スタイル、typography
├── types/               # content.ts (型定義)
└── consts.ts            # SITE_TITLE, SITE_DESCRIPTION
```

**Routing Logic:** Keep top-level routing in `src/pages/`, delegate view logic to `src/components/`. Layout wrappers belong in `src/layouts/`.
