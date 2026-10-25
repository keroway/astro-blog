// CMS (Sveltia) は ogImage を `/src/assets/...` のソース画像パスで保存する。公開 URL ではない。
// 外部 URL や `public/` 配下の `/...` パスはそのままメタタグに渡せる。
const CMS_ASSET_PREFIX = "/src/assets/";

export function isCmsAssetPath(value: string): boolean {
  return value.startsWith(CMS_ASSET_PREFIX);
}

/**
 * CMS のソース画像パスを `import.meta.glob` の結果から引く。
 * 見つからないパスは公開 URL として無効なメタタグになるため、黙って通さずビルドを落とす。
 */
export function lookupCmsAsset<T>(
  value: string,
  assets: Record<string, T>,
  postId: string
): T {
  const asset = assets[value];
  if (!asset) {
    throw new Error(
      `ogImage "${value}" (blog/${postId}) に対応する画像が ${CMS_ASSET_PREFIX} にありません`
    );
  }
  return asset;
}
