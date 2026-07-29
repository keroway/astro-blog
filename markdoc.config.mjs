import { component, defineMarkdocConfig } from "@astrojs/markdoc/config";
import shiki from "@astrojs/markdoc/shiki";
import githubLight from "@shikijs/themes/github-light";
import kanagawaWave from "@shikijs/themes/kanagawa-wave";

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
//
// コメント色だけは両テーマとも --kw-bg-alt 上で WCAG AA (4.5:1) 未達だったため (#608)、
// shiki の colorReplacements で明度だけずらして差し替える。
// テーマ ID 文字列ではなくテーマオブジェクトを渡しているのは、Astro の ShikiConfig が
// codeToHtml 側の colorReplacements オプションを素通ししないため
// (テーマオブジェクト側の colorReplacements は shiki のテーマ正規化時に適用される)。
//
//   light  #6a737d on #E9DECB = 3.62:1 → #5a6069 = 4.76:1
//   dark   #727169 on #0F2244 = 3.21:1 → #8f8d85 = 4.74:1
//
// kanagawa-wave の #727169 は comment のほか markdown の blockquote / fenced code
// トークンにも使われており、いずれも同じ理由で引き上げ対象。
const THEMES = {
  light: {
    ...githubLight,
    colorReplacements: { "#6a737d": "#5a6069" },
  },
  dark: {
    ...kanagawaWave,
    colorReplacements: { "#727169": "#8f8d85" },
  },
};

export default defineMarkdocConfig({
  extends: [shiki({ themes: THEMES })],

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
