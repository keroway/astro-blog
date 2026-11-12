import { describe, expect, it } from "vitest";
import { mdocFromFile, mdocToFile, splitFrontmatter } from "./mdoc-format";

const lf =
  "---\ntitle: Example\ndescription: Description\npubDate: 2026-01-01\n---\n\nBody\n";
const crlf = lf.replace(/\n/g, "\r\n");
const expected = {
  title: "Example",
  description: "Description",
  pubDate: "2026-01-01",
};

describe("mdocFromFile", () => {
  it.each([
    ["LF", lf],
    ["CRLF", crlf],
    ["BOM + LF", `﻿${lf}`],
    ["BOM + CRLF", `﻿${crlf}`],
  ])("%s の frontmatter と本文を分離する", (_name, input) => {
    const result = mdocFromFile(input);

    expect(result).toMatchObject(expected);
    expect(result.body.trim()).toBe("Body");
  });

  it("frontmatter が無ければ全体を本文にする", () => {
    expect(splitFrontmatter("Body\r\n")).toEqual({
      frontmatter: {},
      body: "Body\r\n",
    });
  });

  it("終了区切りが無ければ全体を本文にする", () => {
    const input = "---\r\ntitle: x\r\n";

    expect(splitFrontmatter(input)).toEqual({ frontmatter: {}, body: input });
  });

  it("空の frontmatter を扱う", () => {
    expect(splitFrontmatter("---\n---\nBody")).toEqual({
      frontmatter: {},
      body: "Body",
    });
  });
});

describe("mdocToFile", () => {
  it("CRLF 入力の round trip で frontmatter が重複しない", () => {
    const out = mdocToFile(mdocFromFile(crlf));

    expect(out.match(/^---$/gm)).toHaveLength(2);
    expect(mdocFromFile(out)).toMatchObject(expected);
  });
});
