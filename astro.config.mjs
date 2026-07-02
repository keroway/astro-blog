import path from "node:path";
import { fileURLToPath } from "node:url";
import markdoc from "@astrojs/markdoc";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import { defineConfig, fontProviders } from "astro/config";
import { createIndex } from "pagefind";
import sirv from "sirv";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

/**
 * Pagefind をインライン統合する。
 *
 * 旧: astro-pagefind (サードパーティラッパー, 単一保守者) を使用。
 * 新: pagefind Node API を直接呼ぶことでラッパー依存を除去。
 *   - astro:build:done — createIndex → addDirectory → writeFiles で dist/pagefind/ を生成。
 *   - astro:server:setup — dev 時は sirv で dist/ 内の pagefind/ を配信。
 * 検索 UI (BlogSearch.astro) は /pagefind/pagefind.js を直接 dynamic import するため変更不要。
 * 参照: ADR 0015 / 0017 (#XXX)
 */
function pagefindIntegration() {
  /** hybrid output 時の client dist パス (adapter 設定時のみ) */
  let clientDir;
  return {
    name: "pagefind-inline",
    hooks: {
      "astro:config:setup": ({ config }) => {
        if (config.adapter) {
          clientDir = fileURLToPath(config.build.client);
        }
      },
      "astro:server:setup": ({ server }) => {
        // ビルド済みの dist/pagefind/ を dev サーバで配信する。
        // 初回 build を済ませてから dev を起動した場合にのみ機能する (pagefind 本来の制約)。
        const outDir =
          clientDir ??
          path.join(server.config.root, server.config.build.outDir);
        const serve = sirv(outDir, { dev: true, etag: true });
        server.middlewares.use((req, res, next) => {
          if (req.url?.startsWith("/pagefind/")) {
            serve(req, res, next);
          } else {
            next();
          }
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const { index, errors: createErrors } = await createIndex();
        if (!index) {
          logger.error("Pagefind: インデックス作成に失敗しました");
          for (const e of createErrors) logger.error(e);
          return;
        }
        const { page_count, errors: addErrors } = await index.addDirectory({
          path: outDir,
        });
        if (addErrors.length) {
          logger.error("Pagefind: ファイルのインデックス化に失敗しました");
          for (const e of addErrors) logger.error(e);
          return;
        }
        const { outputPath, errors: writeErrors } = await index.writeFiles({
          outputPath: path.join(outDir, "pagefind"),
        });
        if (writeErrors.length) {
          logger.error("Pagefind: インデックスの書き込みに失敗しました");
          for (const e of writeErrors) logger.error(e);
          return;
        }
        logger.info(
          `Pagefind: ${page_count} ページをインデックス化 → ${outputPath}`
        );
      },
    },
  };
}

// CMS は Sveltia CMS (public/admin/) — CDN 配信の静的 SPA で Astro に依存しない (ADR 0016)。
export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel(),
  // ClientRouter 利用時のデフォルト挙動を明示する (#465)。
  // saveData などのユーザー設定は Astro の prefetch ランタイム側で尊重される。
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    UnoCSS(),
    markdoc(),
    sitemap({
      // /admin (Sveltia CMS) / /api はクロール対象から除外。
      // robots.txt と vercel.json の X-Robots-Tag と合わせて三重に防衛。
      filter: (page) => !/^https?:\/\/[^/]+\/(admin|api)(\/|$)/.test(page),
    }),
    pagefindIntegration(),
  ],
  fonts: [
    {
      name: "Shippori Mincho",
      cssVariable: "--font-display",
      provider: fontProviders.fontsource(),
      // 実使用は見出し・ロゴ系の medium のみ (#476)。本文の bold は --font-body が担う。
      weights: [500],
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
      // 本文 regular と strong/bold 用。600 指定は近い 700 にフォールバックさせる (#476)。
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
      // regular と mono UI の medium のみ使用。700 は未使用のため削除 (#476)。
      weights: [400, 500],
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
      // @sveltia/cms (src/pages/admin.astro) は単一の事前バンドル済み .mjs
      // (node_modules/@sveltia/cms/dist/sveltia-cms.mjs, 未圧縮で約1.9MB) として
      // 配布されており、Rollup が分割できるモジュール境界を持たない。/admin は
      // noindex かつサイトマップ・robots.txt からも除外された管理画面専用ページで、
      // 一般訪問者には配信されず Lighthouse 計測対象にも含まれないため、この1チャンクの
      // みデフォルトの 500kB 警告閾値を超えることを許容する (#454)。
      // 他ページのチャンクが肥大化した場合は引き続きこの閾値内で警告されるよう、
      // 上限は現状のバンドルサイズ+余裕分に留める。
      chunkSizeWarningLimit: 2200,
    },
  },
});
