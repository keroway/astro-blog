import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import satori from "satori";
import { categoryLabel } from "../../consts";
import { getPublishedPosts } from "../../lib/content";
import type { BlogEntry } from "../../types/content";

const WIDTH = 1200;
const HEIGHT = 630;

// Kanagawa design system — dark-mode palette (hardcoded for static image generation)
const COLORS = {
  bg: "#0B1B33", // --kw-paper dark
  sand: "#D9B382", // --kw-sand accent
  ink: "#E8EDF6", // --kw-ink dark
  inkDim: "#9AA6BD", // --kw-ink-dim dark
  road: "#6F8FA8", // --kw-road dark
  roadSoft: "#213A55", // --kw-road-soft dark
  seal: "#B43D2F", // --kw-accent-strong
} as const;

let fontCache: { regular: Buffer; bold: Buffer } | null = null;

function loadFonts() {
  if (!fontCache) {
    // Use woff format from @fontsource/zen-maru-gothic — satori's opentype.js supports woff but not woff2
    const base = join(
      process.cwd(),
      "node_modules/@fontsource/zen-maru-gothic/files"
    );
    fontCache = {
      regular: readFileSync(
        join(base, "zen-maru-gothic-japanese-400-normal.woff")
      ),
      bold: readFileSync(
        join(base, "zen-maru-gothic-japanese-700-normal.woff")
      ),
    };
  }
  return fontCache;
}

export async function getStaticPaths() {
  const posts = await getPublishedPosts();
  return posts.map((post) => ({
    params: { slug: post.id },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const post = props as BlogEntry;
  const { title, category } = post.data;
  const fonts = loadFonts();

  const svg = await satori(buildElement(title, categoryLabel(category)), {
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
  const png = new Uint8Array(resvg.render().asPng());

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
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

function buildElement(title: string, category?: string): SatoriElement {
  const titleFontSize = title.length > 40 ? 40 : title.length > 25 ? 48 : 56;

  const categoryBadge = category
    ? el(
        "div",
        {
          display: "flex",
          fontSize: 22,
          color: COLORS.sand,
          fontWeight: 400,
          letterSpacing: "0.06em",
          marginBottom: 24,
        },
        category,
        "category"
      )
    : null;

  const titleBlock = el(
    "div",
    {
      display: "flex",
      fontSize: titleFontSize,
      fontWeight: 700,
      color: COLORS.ink,
      lineHeight: 1.5,
      flexGrow: 1,
    },
    title,
    "title"
  );

  const motif = el(
    "div",
    {
      display: "flex",
      position: "absolute",
      right: 72,
      bottom: 120,
      width: 520,
      height: 150,
      opacity: 0.82,
    },
    [
      el(
        "div",
        {
          position: "absolute",
          left: 0,
          top: 76,
          width: 520,
          height: 10,
          backgroundColor: COLORS.roadSoft,
          borderRadius: 999,
        },
        undefined,
        "road-band"
      ),
      el(
        "div",
        {
          position: "absolute",
          left: 0,
          top: 80,
          width: 520,
          height: 2,
          backgroundColor: COLORS.road,
        },
        undefined,
        "road-line"
      ),
      ...[72, 170, 278, 386, 492].map((left, index) =>
        el(
          "div",
          {
            position: "absolute",
            left,
            top: index % 2 === 0 ? 72 : 84,
            width: 16,
            height: 16,
            borderRadius: 999,
            backgroundColor: COLORS.sand,
            border: `3px solid ${COLORS.bg}`,
          },
          undefined,
          `station-${index}`
        )
      ),
      el(
        "div",
        {
          position: "absolute",
          right: 8,
          top: 6,
          width: 92,
          height: 92,
          borderRadius: 999,
          border: `4px solid ${COLORS.seal}`,
          color: COLORS.seal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 44,
          fontWeight: 700,
        },
        "K",
        "seal"
      ),
    ],
    "motif"
  );

  const siteLabel = el(
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
        "accent-bar"
      ),
      el(
        "div",
        {
          fontSize: 24,
          color: COLORS.inkDim,
          letterSpacing: "0.08em",
        },
        "keroway.com",
        "site-name"
      ),
    ],
    "site"
  );

  const topSection = el(
    "div",
    { display: "flex", flexDirection: "column", flexGrow: 1 },
    [categoryBadge, titleBlock].filter(Boolean) as SatoriElement[],
    "top"
  );

  return el(
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
      position: "relative",
      overflow: "hidden",
    },
    [motif, topSection, siteLabel]
  );
}
