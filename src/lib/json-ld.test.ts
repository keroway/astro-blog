import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("script 終了タグを含む文字列でも '<' を出力に残さない", () => {
    const data = {
      headline: "記事</script><img src=x data-injected=true>",
      description: "</SCRIPT >",
      author: { name: "<!--" },
    };
    const out = serializeJsonLd(data);
    expect(out).not.toContain("<");
    expect(out).toContain("\\u003c/script>");
  });

  it("JSON.parse で元の値に復元できる", () => {
    const data = {
      headline: "記事</script><img src=x>",
      nested: [{ name: "a<b" }],
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("通常の値は JSON.stringify と一致する", () => {
    const data = { "@type": "Person", name: "keroway", knowsAbout: ["Astro"] };
    expect(serializeJsonLd(data)).toBe(JSON.stringify(data));
  });
});
