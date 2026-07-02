import rss from "@astrojs/rss";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import {
  getPublishedPosts,
  getSortedWorks,
  resolveWorksDate,
} from "../lib/content";
import { encodeSlugId } from "../lib/slug";

export async function GET(context) {
  const [posts, works] = await Promise.all([
    getPublishedPosts(),
    getSortedWorks(),
  ]);
  const items = [
    ...posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${encodeSlugId(post.id)}/`,
      categories: ["blog", ...(post.data.tags ?? [])],
      author: post.data.author ?? SITE_AUTHOR,
      customData: post.data.updatedDate
        ? `<dc:date>${post.data.updatedDate.toISOString()}</dc:date>`
        : undefined,
    })),
    ...works.map((work) => ({
      title: work.data.title,
      description: work.data.description,
      pubDate: resolveWorksDate(work),
      link: `/works/${encodeSlugId(work.id)}/`,
      categories: ["works", ...(work.data.tags ?? [])],
      author: SITE_AUTHOR,
      customData: work.data.lpUrl
        ? `<guid isPermaLink="false">works:${work.id}</guid>`
        : undefined,
    })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: `${SITE_TITLE} Feed`,
    description: `${SITE_DESCRIPTION} Blog と Works の統合フィード`,
    site: context.site,
    customData: `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
  });
}
