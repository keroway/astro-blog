import rss from "@astrojs/rss";
import { getSortedWorks, resolveWorksDate } from "../../lib/content";
import { encodeSlugId } from "../../lib/slug";

export async function GET(context) {
  const works = await getSortedWorks();
  return rss({
    title: "keroway Works",
    description: "keroway の Works / Tools 一覧と更新情報",
    site: context.site,
    items: works.map((work) => ({
      title: work.data.title,
      description: work.data.description,
      pubDate: resolveWorksDate(work),
      link: `/works/${encodeSlugId(work.id)}/`,
    })),
  });
}
