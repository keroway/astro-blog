import type { CollectionEntry } from "astro:content";

/** blog コレクションのエントリ */
export type BlogEntry = CollectionEntry<"blog">;
/** blog エントリの frontmatter (data) */
export type BlogData = BlogEntry["data"];
/** works コレクションのエントリ */
export type WorksEntry = CollectionEntry<"works">;
