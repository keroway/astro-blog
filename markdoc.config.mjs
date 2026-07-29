import { component, defineMarkdocConfig } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";

// コンテンツはすべて .mdoc (blog/works 計54件以上)。
// Markdoc 本文は astro.config.mjs の markdown.shikiConfig を参照しないため、
// dual theme をここで設定する。背景色は global.css で --kw-bg-alt に固定し、
// テーマからは前景トークン色だけを採る。
//
// dark は kanagawa-wave。サイトの --kw-* パレット (北斎「神奈川沖浪裏」) とは別系統だが、
// コードブロックは「エディタ面」なので同名の kanagawa.nvim 由来テーマを当てる。
// 青系トークンがサイトの紺と同じ色相帯にあり、紺背景 (#0F2244) 上でよく馴染む。
//
// light は github-light を据え置く。kanagawa-lotus は本来「明るい紙にごく淡く」を狙った
// 低コントラストテーマで、--kw-bg-alt (#E9DECB) 上ではトークン 18 色中 16 色が
// WCAG AA (4.5:1) 未達、中央値 3.36:1 まで落ちる (github-light は 6/12・中央値 4.73:1)。
// 「ハイライトされた箇所ほど薄い」逆転が起きるため、light だけ統一を見送る。
export default defineMarkdocConfig({
  extends: [
    shiki({
      themes: {
        light: "github-light",
        dark: "kanagawa-wave",
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
