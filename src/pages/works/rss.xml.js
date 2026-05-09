import { getCollection } from "astro:content";
import rss from "@astrojs/rss";

export async function GET(context) {
  const works = (await getCollection("works"))
    .slice()
    .sort(
      (a, b) =>
        (b.data.updatedAt ?? b.data.createdAt).valueOf() -
        (a.data.updatedAt ?? a.data.createdAt).valueOf()
    );
  return rss({
    title: "keroway Works",
    description: "keroway の Works / Tools 一覧と更新情報",
    site: context.site,
    items: works.map((work) => ({
      title: work.data.title,
      description: work.data.description,
      pubDate: work.data.updatedAt ?? work.data.createdAt,
      link: `/works/${work.id
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/")}/`,
    })),
  });
}
