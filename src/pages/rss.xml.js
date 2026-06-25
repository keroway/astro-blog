import rss from "@astrojs/rss";
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from "../consts";
import { getPublishedPosts } from "../lib/content";
import { encodeSlugId } from "../lib/slug";

export async function GET(context) {
  const posts = await getPublishedPosts();
  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site,
    // feed-level の lastBuildDate を customData で付与
    customData: `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items: posts.map((post) => {
      const encodedSlug = encodeSlugId(post.id);
      return {
        title: post.data.title,
        // description は著作権ポリシー (All Rights Reserved) に従い抜粋のみ配信する
        description: post.data.description,
        pubDate: post.data.pubDate,
        link: `/blog/${encodedSlug}/`,
        // 更新日があれば <pubDate> の後ろに atom:updated 相当を customData で補足
        customData: post.data.updatedDate
          ? `<dc:date>${post.data.updatedDate.toISOString()}</dc:date>`
          : undefined,
        // tags → RSS categories
        categories: post.data.tags ?? [],
        // author は "name (email)" 形式が RSS 2.0 仕様だが、email 非公開のため
        // name のみ配信する（一部リーダーは name のみでも解釈する）
        author: post.data.author ?? SITE_AUTHOR,
      };
    }),
  });
}
