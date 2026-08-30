// vitest 用の astro:content スタブ
// setMockCollection でテストごとに注入したフィクスチャに、実装と同じ filter 関数を
// 適用して返す (getPublishedPosts の draft / pubDate 分岐などをテスト可能にするため)。
type CollectionName = "blog" | "works";

const collections: Record<CollectionName, unknown[]> = {
  blog: [],
  works: [],
};

export function setMockCollection(name: CollectionName, entries: unknown[]) {
  collections[name] = entries;
}

export async function getCollection<T>(
  name: CollectionName,
  filter?: (entry: T) => boolean
): Promise<T[]> {
  const entries = (collections[name] ?? []) as T[];
  return filter ? entries.filter(filter) : entries;
}
