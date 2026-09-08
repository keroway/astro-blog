import { afterEach, describe, expect, it } from "vitest";
import { setMockCollection } from "../src/lib/__mocks__/astro-content";
import { GET as getFeedXml } from "../src/pages/feed.xml.js";
import { GET as getRssXml } from "../src/pages/rss.xml.js";
import type { BlogEntry } from "../src/types/content";

afterEach(() => {
  setMockCollection("blog", []);
  setMockCollection("works", []);
});

function makeBlogEntry(
  id: string,
  overrides: Partial<BlogEntry["data"]> = {}
): BlogEntry {
  return {
    id,
    body: "本文",
    collection: "blog",
    data: {
      title: `記事 ${id}`,
      description: `説明 ${id}`,
      pubDate: new Date("2024-01-01"),
      draft: false,
      ...overrides,
    },
    render: async () => ({
      Content: () => null,
      headings: [],
      remarkPluginFrontmatter: {},
    }),
  } as unknown as BlogEntry;
}

// XML 名前空間の well-formedness (Namespaces in XML §4): 接頭辞付き要素は
// 対応する xmlns:<prefix> 宣言がルート要素になければ unbound prefix になる。
function assertNamespacesDeclared(xml: string) {
  const usedPrefixes = new Set(
    [...xml.matchAll(/<([a-zA-Z][\w-]*):[\w-]+/g)].map((m) => m[1])
  );
  for (const prefix of usedPrefixes) {
    expect(xml).toMatch(new RegExp(`xmlns:${prefix}="[^"]+"`));
  }
}

describe("rss.xml / feed.xml の Dublin Core 名前空間", () => {
  const site = new URL("https://keroway.com");

  it("rss.xml: updatedDate があっても xmlns:dc を宣言する", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", { updatedDate: new Date("2024-02-01") }),
    ]);
    const res = await getRssXml({ site } as never);
    const xml = await res.text();
    expect(xml).toContain("<dc:date>");
    assertNamespacesDeclared(xml);
  });

  it("rss.xml: updatedDate が無くても xmlns:dc 宣言自体は害にならない", async () => {
    setMockCollection("blog", [makeBlogEntry("a")]);
    const res = await getRssXml({ site } as never);
    const xml = await res.text();
    expect(xml).not.toContain("<dc:date>");
    assertNamespacesDeclared(xml);
  });

  it("feed.xml: updatedDate があっても xmlns:dc を宣言する", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", { updatedDate: new Date("2024-02-01") }),
    ]);
    const res = await getFeedXml({ site } as never);
    const xml = await res.text();
    expect(xml).toContain("<dc:date>");
    assertNamespacesDeclared(xml);
  });
});
