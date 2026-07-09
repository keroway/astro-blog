import type { APIRoute } from "astro";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { getPublishedPosts, getSortedWorks } from "../lib/content";
import { encodeSlugId } from "../lib/slug";

// llms.txt 規約 (https://llmstxt.org/) に基づく静的エンドポイント。
// 著作権ポリシー (All Rights Reserved / rss.xml.js 参照) に従い、
// 本文全文は含めず「タイトル + 抜粋 + 正規 URL」に留める (#554)。
// llms-full.txt (全文掲載版) は作らない。
export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site ? new URL("/", site).toString() : "https://keroway.com/";
  const base = siteUrl.replace(/\/$/, "");

  const [posts, works] = await Promise.all([
    getPublishedPosts(),
    getSortedWorks(),
  ]);

  const blogLines = posts.map((post) => {
    const url = `${base}/blog/${encodeSlugId(post.id)}/`;
    const description = post.data.description?.trim();
    return description
      ? `- [${post.data.title}](${url}): ${description}`
      : `- [${post.data.title}](${url})`;
  });

  const worksLines = works.map((work) => {
    const url = `${base}/works/${encodeSlugId(work.id)}/`;
    const description = work.data.description?.trim();
    return description
      ? `- [${work.data.title}](${url}): ${description}`
      : `- [${work.data.title}](${url})`;
  });

  const lines = [
    `# ${SITE_TITLE}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "## Blog",
    "",
    ...blogLines,
    "",
    "## Works",
    "",
    ...worksLines,
    "",
    "## Pages",
    "",
    `- [About](${base}/about/): 著者プロフィール`,
    `- [Now](${base}/now/): 近況`,
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
