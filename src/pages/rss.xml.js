import rss from "@astrojs/rss";
import { SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { getPublishedPosts } from "../lib/content";
import { encodeSlugId } from "../lib/slug";

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    items: posts.map((post) => {
      const encodedSlug = encodeSlugId(post.id);
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
