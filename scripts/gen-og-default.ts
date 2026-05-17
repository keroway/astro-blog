import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import satori from "satori";

const WIDTH = 1200;
const HEIGHT = 630;
const COLORS = {
  bg: "#0B1B33",
  sand: "#D9B382",
  ink: "#E8EDF6",
  inkDim: "#9AA6BD",
} as const;

const base = join(
  import.meta.dirname,
  "../node_modules/@fontsource/zen-maru-gothic/files"
);
const fonts = {
  regular: readFileSync(join(base, "zen-maru-gothic-japanese-400-normal.woff")),
  bold: readFileSync(join(base, "zen-maru-gothic-japanese-700-normal.woff")),
};

type SatoriElement = {
  type: string;
  key: string | null;
  props: Record<string, unknown>;
};

function el(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  key?: string
): SatoriElement {
  return {
    type,
    key: key ?? null,
    props: { style, ...(children !== undefined ? { children } : {}) },
  };
}

const root = el(
  "div",
  {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.bg,
    padding: "60px 80px",
    borderLeft: `8px solid ${COLORS.sand}`,
    boxSizing: "border-box",
  },
  [
    el("div", { display: "flex", flexDirection: "column", gap: 16 }, [
      el(
        "div",
        {
          fontSize: 28,
          color: COLORS.sand,
          fontWeight: 400,
          letterSpacing: "0.06em",
        },
        "keroway.com"
      ),
      el(
        "div",
        {
          fontSize: 64,
          fontWeight: 700,
          color: COLORS.ink,
          lineHeight: 1.4,
        },
        "engineering + design"
      ),
    ]),
    el(
      "div",
      {
        display: "flex",
        alignItems: "center",
        gap: 14,
      },
      [
        el(
          "div",
          {
            width: 4,
            height: 28,
            backgroundColor: COLORS.sand,
            borderRadius: 2,
          },
          undefined,
          "bar"
        ),
        el(
          "div",
          { fontSize: 22, color: COLORS.inkDim, letterSpacing: "0.08em" },
          "personal tech blog",
          "sub"
        ),
      ]
    ),
  ]
);

const svg = await satori(root, {
  width: WIDTH,
  height: HEIGHT,
  fonts: [
    {
      name: "Zen Maru Gothic",
      data: fonts.regular,
      weight: 400,
      style: "normal",
      lang: "ja-JP",
    },
    {
      name: "Zen Maru Gothic",
      data: fonts.bold,
      weight: 700,
      style: "normal",
      lang: "ja-JP",
    },
  ],
});

const resvg = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } });
const png = resvg.render().asPng();

const outPath = join(import.meta.dirname, "../public/og-default.png");
writeFileSync(outPath, png);
console.log("Generated:", outPath);
