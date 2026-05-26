/**
 * Content Layer の `post.id` (日本語を含むスラグ) を HTML の href に出すための
 * パーセントエンコード。パスセグメントごとに encodeURIComponent する。
 *
 * 注意: `getStaticPaths()` の `params` にはエンコード前の `id` を渡すこと。
 * Astro が内部でエンコードするため、ここでエンコードすると二重デコードで 404 になる。
 * (CLAUDE.md "Critical: Japanese Slug Encoding Pattern" 参照)
 */
export function encodeSlugId(id: string): string {
  return id
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}
