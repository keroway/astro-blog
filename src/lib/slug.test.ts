import { describe, expect, it } from "vitest";
import { encodeSlugId } from "./slug";

describe("encodeSlugId", () => {
  it("ASCII スラッグはそのまま返す", () => {
    expect(encodeSlugId("hello-world")).toBe("hello-world");
  });

  it("日本語スラッグをパーセントエンコードする", () => {
    // ADR 0010 のユースケース: 日本語タイトルを含むファイル名
    expect(encodeSlugId("技術メモ")).toBe(
      "%E6%8A%80%E8%A1%93%E3%83%A1%E3%83%A2"
    );
  });

  it("スラッシュはセパレータとして保持し、各セグメントをエンコードする", () => {
    expect(encodeSlugId("blog/技術/記事")).toBe(
      "blog/%E6%8A%80%E8%A1%93/%E8%A8%98%E4%BA%8B"
    );
  });

  it("括弧・スペースを含む実際のスラッグをエンコードする（旧 URL 形式）", () => {
    // vercel.json のリダイレクト元を確認した実例
    expect(encodeSlugId("Mastodon on Docker(2)")).toBe(
      "Mastodon%20on%20Docker(2)"
    );
  });

  it("空文字列はそのまま返す", () => {
    expect(encodeSlugId("")).toBe("");
  });

  it("スラッシュのみの場合はそのまま返す", () => {
    expect(encodeSlugId("/")).toBe("/");
  });

  it("複数スラッシュを含む場合は各セグメントを個別にエンコードする", () => {
    expect(encodeSlugId("a b/c d")).toBe("a%20b/c%20d");
  });
});
