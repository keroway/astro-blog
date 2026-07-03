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

/**
 * View Transitions の `transition:name` は CSS <custom-ident> でなければならず、
 * 日本語スラグをそのまま使うと不正な値になる (issue #500)。
 * `encodeURIComponent` の `%XX` は custom-ident として無効なので `-` に置換する。
 * `.` は CSS トークナイザ上数値トークンと衝突しうることがあり (例: 数字の後の `.`)、
 * `encodeURIComponent` ではエスケープされないため、なお安全側に寄せて明示的に `-` へ置換する。
 * 決定的かつ英数字・ハイフンのみの識別子へ変換する。
 * 一覧側と詳細側で同じ id から生成すれば必ず一致する。
 */
export function toTransitionName(prefix: string, id: string): string {
  const safe = encodeURIComponent(id).replace(/%/g, "-").replace(/\./g, "-");
  return `${prefix}-${safe}`;
}
