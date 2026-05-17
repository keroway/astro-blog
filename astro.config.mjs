import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";
const isProduction = process.env.NODE_ENV === "production";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [
    UnoCSS(),
    mdx(),
    sitemap(),
    // Keystatic 管理 UI は開発時のみ有効。本番 SSG ビルドからは除外する
    ...(isProduction ? [] : [react(), keystatic()]),
  ],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
