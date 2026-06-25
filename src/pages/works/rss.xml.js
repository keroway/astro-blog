import rss from "@astrojs/rss";
import { SITE_AUTHOR } from "../../consts";
import { getSortedWorks, resolveWorksDate } from "../../lib/content";
import { encodeSlugId } from "../../lib/slug";

export async function GET(context) {
  const works = await getSortedWorks();
  return rss({
    title: "keroway Works",
    description: "keroway の Works / Tools 一覧と更新情報",
    site: context.site,
    customData: `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items: works.map((work) => ({
      title: work.data.title,
      description: work.data.description,
      pubDate: resolveWorksDate(work),
      link: `/works/${encodeSlugId(work.id)}/`,
      categories: work.data.tags,
      author: SITE_AUTHOR,
      // LP へのリンクを enclosure 的に customData で補足
      customData: work.data.lpUrl
        ? `<guid isPermaLink="false">${work.id}</guid>`
        : undefined,
    })),
  });
}
