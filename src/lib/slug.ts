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
 * 英数字とハイフン以外 (`_` 自身を含む) は UTF-8 バイトごとに `_XX` (大文字 16 進) へ
 * エスケープする。`_` は必ず 2 桁の 16 進を伴うので、異なる id は異なる識別子になる (単射)。
 * 決定的なので、一覧側と詳細側で同じ id から生成すれば必ず一致する。
 */
export function toTransitionName(prefix: string, id: string): string {
  const safe = Array.from(new TextEncoder().encode(id), (byte) => {
    const ch = String.fromCharCode(byte);
    return /[A-Za-z0-9-]/.test(ch)
      ? ch
      : `_${byte.toString(16).toUpperCase().padStart(2, "0")}`;
  }).join("");
  return `${prefix}-${safe}`;
}
