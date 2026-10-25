/**
 * JSON-LD を `<script type="application/ld+json">` 内へ埋め込むためにシリアライズする。
 * `<` を Unicode エスケープし、`</script>` 等が HTML パーサーに現れないようにする (#899)。
 * JSON.parse すると元の値に復元できる。
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
