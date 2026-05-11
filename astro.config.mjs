import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

// https://astro.build/config
export default defineConfig({
  site: siteUrl,
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
});
