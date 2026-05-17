import { getCollection } from "astro:content";
import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";

export async function GET(context) {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const toEncodedSlug = (slug) =>
    slug
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => {
        const encodedSlug = toEncodedSlug(post.id);
        const ogImageUrl = new URL(`og/${encodedSlug}.png`, context.site).href;
        return {
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.pubDate,
          link: `/blog/${encodedSlug}/`,
          customData: `<enclosure url="${ogImageUrl}" type="image/png" length="0" />`,
        };
      }),
  });
}
