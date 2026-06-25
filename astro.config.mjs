import markdoc from "@astrojs/markdoc";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { defineConfig, fontProviders } from "astro/config";
import pagefind from "astro-pagefind";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

const vercelEnv = process.env.VERCEL_ENV;
const isVercelProduction = vercelEnv === "production";
const isVercelPreview = vercelEnv === "preview";

// Vercel Production で Keystatic の env が揃っていないと local モードで動いてしまい、
// Vercel Function の ephemeral filesystem に書き込もうとして admin UI が無音で機能不全になる。
// keystatic.config.ts はブラウザにも bundle されるため process.env を読めない (PUBLIC_ prefix の
// import.meta.env を使う) 一方、astro.config.mjs はサーバー専用なので process.env で十分。
// ビルド時に確実に fail-fast させたいのでこのチェックは astro.config.mjs 側に集約する。
if (
  isVercelProduction &&
  process.env.PUBLIC_KEYSTATIC_STORAGE_KIND !== "github"
) {
  throw new Error(
    "Keystatic: VERCEL_ENV=production では PUBLIC_KEYSTATIC_STORAGE_KIND=github が必須です。" +
      " Vercel の環境変数を docs/cms-flow.md の手順に従って設定してください。"
  );
}

// Preview デプロイは記事プレビュー専用に割り切り、Keystatic 統合を mount しない。
// 理由: Preview の Vercel Function も ephemeral filesystem で、local モードで起動すると
// "保存できた" と誤認させてデータロストする (production と同じ fail-open 経路)。
// production → 常に有効 (github mode 強制)
// preview → 無効 (/keystatic は 404)
// local dev (VERCEL_ENV 未定義) → 有効 (local mode で従来通り動作)
// markdoc は Keystatic content フィールド (.mdoc) の描画に必須。書き込みを伴わないため
// Preview でも有効でよい (mount を絞るのは keystatic 統合のみ)。設定は markdoc.config.mjs。
//
// pagefind は astro build の astro:build:done フックで dist/ をクロールし dist/pagefind/ に
// 静的全文検索インデックスを生成する (ADR 0015)。CI (`astro build` 直叩き) と Vercel
// (`pnpm run build`) の両ビルド経路で astro build を通るため、別途 postbuild ステップは不要。
// dev モードでは直前の build 成果物のインデックスを serve する。検索基盤なので全環境で有効。
const baseIntegrations = [
  UnoCSS(),
  markdoc(),
  sitemap({
    // /keystatic (管理UI) はクロール対象から除外 (robots.txt と合わせて二重に防衛)。
    // on-demand ルートなので静的ページとして生成されないが、念のためフィルタを掛ける。
    filter: (page) => !/^https?:\/\/[^/]+\/(keystatic|api)(\/|$)/.test(page),
  }),
  pagefind(),
];
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
