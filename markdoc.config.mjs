import { defineMarkdocConfig } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";

// Markdoc 本文 (.mdoc) は astro.config.mjs の markdown.shikiConfig を参照しない。
// コードブロックのハイライトを既存 .md 記事と揃えるため、ここで同じ dual theme
// (github-light / github-dark) を再宣言する。テーマがズレるとコード色が乖離する。
export default defineMarkdocConfig({
  extends: [
    shiki({
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    }),
  ],
});
