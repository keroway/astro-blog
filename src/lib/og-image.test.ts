import { describe, expect, it } from "vitest";
import { isCmsAssetPath, lookupCmsAsset, resolveOgImageSize } from "./og-image";

describe("isCmsAssetPath", () => {
  it("CMS が保存する /src/assets/ のソースパスを検出する", () => {
    expect(isCmsAssetPath("/src/assets/content/blog/1be8323d89b5.jpg")).toBe(
      true
    );
  });

  it("外部 URL と public 配下のパスは対象外", () => {
    expect(isCmsAssetPath("https://example.com/og.png")).toBe(false);
    expect(isCmsAssetPath("/og/custom.png")).toBe(false);
  });
});

describe("lookupCmsAsset", () => {
  const assets = { "/src/assets/content/blog/a.jpg": { src: "a" } };

  it("存在するソースパスのアセットを返す", () => {
    expect(
      lookupCmsAsset("/src/assets/content/blog/a.jpg", assets, "post")
    ).toEqual({ src: "a" });
  });

  it("存在しないパスは投稿 ID 付きのエラーにする", () => {
    expect(() =>
      lookupCmsAsset("/src/assets/content/blog/missing.jpg", assets, "post")
    ).toThrow(/blog\/post/);
  });
});

describe("resolveOgImageSize", () => {
  it("ogImage 未指定なら自動生成画像の 1200x630", () => {
    expect(resolveOgImageSize(undefined, null)).toEqual({
      width: 1200,
      height: 630,
    });
  });

  it("CMS アセットは実寸を返す", () => {
    expect(
      resolveOgImageSize("/src/assets/content/blog/a.png", {
        width: 578,
        height: 263,
      })
    ).toEqual({ width: 578, height: 263 });
  });

  it("実寸不明の外部 URL は null (メタタグ省略)", () => {
    expect(resolveOgImageSize("https://example.com/og.png", null)).toEqual({
      width: null,
      height: null,
    });
  });
});
