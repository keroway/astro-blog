---
paths:
  - "src/components/**"
  - "src/layouts/**"
  - "src/styles/**"
---

# UI コンポーネント / スタイルのルール

CLAUDE.md を補完するパス限定ルール。矛盾があれば CLAUDE.md を正とする。

## Image Handling

Uses `astro:assets` Image component for optimization:
```astro
<Image src={heroImage} width={1020} height={510} alt="..." />
```

Provide `width` and `height` props for static analysis. Hero images on blog cards use CSS `aspect-ratio: 16/9` for consistency.

## Styling Approach

- **Design tokens:** Defined in `src/styles/tokens.css` under the `--kw-*` namespace (e.g. `--kw-accent`, `--kw-bg`, `--kw-fg`); base element styles live in `global.css`. Full spec in `docs/design-system.md`.
- **Typography:** BIZ UDPGothic for body text, Shippori Mincho for headings/signatures, JetBrains Mono for labels/code
- **Component Scoping:** Most styles are component-scoped in `.astro` files
- **Responsive:** Grid-based layouts with auto-fit columns, breakpoints at 900px, 720px, 640px
- **Cards:** Paper-like cards and motif panels using `--kw-*` tokens; hover motion is subtle and must respect reduced-motion

No CSS-in-JS framework; pure CSS only.

## Layout Components

**SiteLayout.astro:**
- Accepts: `title`, `description`, `image`, `mainClass`, `lang` (default: 'ja'), `locale`
- Wraps Header, main slot, Footer
- Auto-maps lang to locale format (ja → ja_JP, en → en_US)
- View Transitions enabled for smooth page navigation

**BlogPost.astro:**
- Expects `CollectionEntry<'blog'>` in data prop
- Renders hero image, post metadata (dates), and markdown content
- Responsive typography with scoped CSS

## グローバルスタイルの更新

`src/styles/tokens.css` でデザイントークン、`src/styles/global.css` でベーススタイルを編集する。コンポーネント固有のスタイルは各 `.astro` コンポーネント内に置く。
