import markdoc from "@astrojs/markdoc";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { defineConfig, fontProviders } from "astro/config";
import pagefind from "astro-pagefind";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

// pagefind は astro build の astro:build:done フックで dist/ をクロールし dist/pagefind/ に
// 静的全文検索インデックスを生成する (ADR 0015)。
// CMS は Sveltia CMS (public/admin/) — CDN 配信の静的 SPA で Astro に依存しない (ADR 0016)。
export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel(),
  integrations: [
    UnoCSS(),
    markdoc(),
    sitemap({
      // /admin (Sveltia CMS) / /api はクロール対象から除外。
      // robots.txt と vercel.json の X-Robots-Tag と合わせて三重に防衛。
      filter: (page) => !/^https?:\/\/[^/]+\/(admin|api)(\/|$)/.test(page),
    }),
    pagefind(),
  ],
  fonts: [
    {
      name: "Shippori Mincho",
      cssVariable: "--font-display",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["japanese", "latin"],
      fallbacks: [
        "YuMincho",
        "游明朝",
        "Hiragino Mincho ProN",
        "Noto Serif JP",
        "serif",
      ],
    },
    {
      name: "BIZ UDPGothic",
      cssVariable: "--font-body",
      provider: fontProviders.fontsource(),
      weights: [400, 700],
      styles: ["normal"],
      subsets: ["japanese", "latin"],
      fallbacks: [
        "Hiragino Sans",
        "Yu Gothic",
        "YuGothic",
        "Noto Sans JP",
        "sans-serif",
      ],
    },
    {
      name: "JetBrains Mono",
      cssVariable: "--font-mono",
      provider: fontProviders.fontsource(),
      weights: [400, 500, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Consolas",
        "monospace",
      ],
    },
  ],
  vite: {
    build: {
      rollupOptions: {
        // Pagefind の検索 API (/pagefind/pagefind.js) はビルド後に astro-pagefind が
        // 生成するため、ビルド時点では存在しない。Rollup の静的解決対象から外す (#341)。
        external: ["/pagefind/pagefind.js"],
      },
    },
  },
});
