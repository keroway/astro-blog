import { defineMarkdocConfig } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";

// コンテンツはすべて .mdoc (blog/works 計54件以上)。
// Markdoc 本文は astro.config.mjs の markdown.shikiConfig を参照しないため、
// dual theme (github-light / github-dark) をここで設定する。
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
