import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

// Keystatic 管理 UI は本番でも /keystatic から開けるようにする。
// admin / API ルートだけが on-demand (Vercel Function) になり、
// ブログや Works などのコンテンツページは引き続き SSG として配信される。
// 詳細は docs/adr/0005-keystatic-admin-runtime.md を参照。
export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel(),
  integrations: [UnoCSS(), mdx(), sitemap(), react(), keystatic()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
