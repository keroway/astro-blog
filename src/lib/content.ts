import { getCollection } from "astro:content";
import type { BlogEntry, WorksEntry } from "../types/content";

const READING_SPEED_CHARS_PER_MIN = 400;

/**
 * 本文の文字数から読了時間 (分) を概算する（400 文字/分・最小 1 分）。
 * readingTime は frontmatter では持たず、ビルド時に本文から常に算出する (#361)。
 */
export function calculateReadingTime(body: string): number {
  const text = body.replace(/^---[\s\S]*?---/, "").trim();
  return Math.max(1, Math.ceil(text.length / READING_SPEED_CHARS_PER_MIN));
}

/**
 * 公開済み (draft でなく pubDate が now 以前) の blog を pubDate 降順で返す。
 * index / blog/index / blog/[...slug] / rss / og で共通利用する。
 */
export async function getPublishedPosts(
  now: Date = new Date()
): Promise<BlogEntry[]> {
  const posts = await getCollection(
    "blog",
    ({ data }) => !data.draft && data.pubDate <= now
  );
  return posts
    .slice()
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/** works エントリの並び替え・表示に使う基準日 (更新日があれば優先、なければ作成日)。 */
export function resolveWorksDate(work: WorksEntry): Date {
  return work.data.updatedAt ?? work.data.createdAt;
}

/** works を基準日 (resolveWorksDate) の降順で返す。 */
export async function getSortedWorks(): Promise<WorksEntry[]> {
  const works = await getCollection("works");
  return works
    .slice()
    .sort(
      (a, b) => resolveWorksDate(b).valueOf() - resolveWorksDate(a).valueOf()
    );
}

/**
 * featured な works を優先し、1 件以上あればそれだけを、無ければ全件を対象に
 * 先頭 limit 件を返す。トップページのピックアップ表示で利用する。
 */
export function pickFeaturedWorks(
  works: WorksEntry[],
  limit: number
): WorksEntry[] {
  const featured = works.filter((w) => w.data.featured);
  return (featured.length > 0 ? featured : works).slice(0, limit);
}

/**
 * 公開済み記事から全タグを収集し、ソートして重複排除した配列を返す。
 */
export async function getAllTags(now: Date = new Date()): Promise<string[]> {
  const posts = await getPublishedPosts(now);
  const tagSet = new Set<string>();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      tagSet.add(tag);
    }
  }
  return [...tagSet].sort((a, b) => a.localeCompare(b, "ja"));
}

/**
 * category 一致 +2 / tag 一致 +1 でスコアリングし、関連度の高い記事を上位 limit 件返す。
 * 同点は pubDate 降順。自分自身とスコア 0 は除外する。
 * limit 件に満たない場合は pubDate 降順の最新記事で補完する。
 */
export function getRelatedPosts(
  post: BlogEntry,
  posts: BlogEntry[],
  limit = 3
): BlogEntry[] {
  const myCategory = post.data.category;
  const myTags = new Set(post.data.tags ?? []);
  const related = posts
    .filter((p) => p.id !== post.id)
    .map((p) => {
      let score = 0;
      if (myCategory && p.data.category === myCategory) score += 2;
      for (const tag of p.data.tags ?? []) {
        if (myTags.has(tag)) score += 1;
      }
      return { post: p, score };
    })
    .filter((x) => x.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf()
    )
    .slice(0, limit)
    .map((x) => x.post);

  if (related.length < limit) {
    const relatedIds = new Set(related.map((r) => r.id));
    const fallback = posts
      .filter((p) => p.id !== post.id && !relatedIds.has(p.id))
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .slice(0, limit - related.length);
    related.push(...fallback);
  }

  return related;
}
