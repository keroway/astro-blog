---
paths:
  - "src/pages/**"
---

# `src/pages/` 配下のルール

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。

## Critical: Japanese Slug Encoding Pattern

Astro 7 の Content Layer API では `post.id` がスラグ（ファイル名から拡張子を除いたもの）になります。`post.id` には日本語文字が含まれるため、HTML の `href` 属性では `encodeURIComponent` が必要ですが、`getStaticPaths()` のパラメータでは**エンコード不要**です（Astro が内部処理）。

1. **Blog post routes** (`src/pages/blog/[...slug].astro`):
   ```typescript
   export async function getStaticPaths() {
     const posts = await getCollection('blog');
     return posts.map((post) => ({
       params: { slug: post.id },  // エンコード不要
       props: post,
     }));
   }
   ```

2. **Blog listing** (`src/pages/blog/[...page].astro`):
   ```typescript
   const encodedSlug = post.id.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   // Used in: <a href={`/blog/${encodedSlug}/`}>
   ```

3. **Homepage and RSS feed** (`src/pages/index.astro`, `src/pages/rss.xml.js`):
   ```typescript
   const encodedSlug = post.id.split('/').map((segment) => encodeURIComponent(segment)).join('/');
   ```

**Why:** HTML の `href` 属性では非ASCII文字をパーセントエンコードする必要がある。`getStaticPaths()` でエンコードすると Astro が二重デコードして 404 になるため、`href` のみエンコードする。

## 新しいページの追加

1. `src/pages/` 配下に `.astro` ファイルを作成する
2. `SiteLayout` を使い、ヘッダー/フッターを統一する
3. URL の一貫性のため kebab-case 命名に従う
