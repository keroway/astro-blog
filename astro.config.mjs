import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

// Vercel Production で Keystatic の env が揃っていないと local モードで動いてしまい、
// Vercel Function の ephemeral filesystem に書き込もうとして admin UI が無音で機能不全になる。
// keystatic.config.ts のガードはランタイム保険として残すが、ビルド時の fail-fast は
// 確実に毎回評価される astro.config.mjs 側でも担保する。Preview / Dev は local OK。
if (
  process.env.VERCEL_ENV === "production" &&
  process.env.KEYSTATIC_STORAGE_KIND !== "github"
) {
  throw new Error(
    "Keystatic: VERCEL_ENV=production では KEYSTATIC_STORAGE_KIND=github が必須です。" +
      " Vercel の環境変数を docs/cms-flow.md の手順に従って設定してください。"
  );
}

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
