import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

const vercelEnv = process.env.VERCEL_ENV;
const isVercelProduction = vercelEnv === "production";
const isVercelPreview = vercelEnv === "preview";

// Vercel Production で Keystatic の env が揃っていないと local モードで動いてしまい、
// Vercel Function の ephemeral filesystem に書き込もうとして admin UI が無音で機能不全になる。
// keystatic.config.ts のガードはランタイム保険として残すが、ビルド時の fail-fast は
// 確実に毎回評価される astro.config.mjs 側でも担保する。
if (isVercelProduction && process.env.KEYSTATIC_STORAGE_KIND !== "github") {
  throw new Error(
    "Keystatic: VERCEL_ENV=production では KEYSTATIC_STORAGE_KIND=github が必須です。" +
      " Vercel の環境変数を docs/cms-flow.md の手順に従って設定してください。"
  );
}

// Preview デプロイは記事プレビュー専用に割り切り、Keystatic 統合を mount しない。
// 理由: Preview の Vercel Function も ephemeral filesystem で、local モードで起動すると
// "保存できた" と誤認させてデータロストする (production と同じ fail-open 経路)。
// production → 常に有効 (github mode 強制)
// preview → 無効 (/keystatic は 404)
// local dev (VERCEL_ENV 未定義) → 有効 (local mode で従来通り動作)
const baseIntegrations = [UnoCSS(), mdx(), sitemap()];
const integrations = isVercelPreview
  ? baseIntegrations
  : [...baseIntegrations, react(), keystatic()];

// Keystatic 管理 UI は本番でも /keystatic から開けるようにする。
// admin / API ルートだけが on-demand (Vercel Function) になり、
// ブログや Works などのコンテンツページは引き続き SSG として配信される。
// 詳細は docs/adr/0005-keystatic-admin-runtime.md を参照。
export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel(),
  integrations,
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
});
