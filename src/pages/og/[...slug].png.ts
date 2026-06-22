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
    },
    [topSection, siteLabel]
  );
}
