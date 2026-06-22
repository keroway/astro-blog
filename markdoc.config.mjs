import { component, defineMarkdocConfig } from "@astrojs/markdoc/config";
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

  // content components (#365): Astro コンポーネントとの接続
  tags: {
    callout: {
      render: component("./src/components/Callout.astro"),
      attributes: {
        type: {
          type: String,
          default: "info",
          matches: ["info", "tip", "warning", "danger"],
        },
        title: { type: String },
      },
    },
    "link-card": {
      render: component("./src/components/LinkCard.astro"),
      attributes: {
        href: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
      },
    },
  },
});
