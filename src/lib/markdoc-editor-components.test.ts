import { describe, expect, it } from "vitest";
import {
  CALLOUT_PATTERN,
  calloutFromBlock,
  calloutToBlock,
  calloutToPreview,
  LINK_CARD_PATTERN,
  linkCardFromBlock,
  linkCardToBlock,
  linkCardToPreview,
} from "./markdoc-editor-components";

describe("callout editor component", () => {
  it("round-trips through toBlock → CALLOUT_PATTERN → fromBlock", () => {
    const block = calloutToBlock({
      type: "warning",
      title: "注意",
      body: "本文の一行目\n本文の二行目",
    });
    const match = block.match(CALLOUT_PATTERN);

    expect(match).not.toBeNull();
    expect(calloutFromBlock(match as RegExpMatchArray)).toEqual({
      type: "warning",
      title: "注意",
      body: "本文の一行目\n本文の二行目",
    });
  });

  it("defaults type to info and omits title attribute when title is empty", () => {
    const block = calloutToBlock({ body: "本文" });

    expect(block).toBe('{% callout type="info" %}\n本文\n{% /callout %}');
  });

  it("falls back to info for an unknown type in fromBlock", () => {
    const match = '{% callout type="bogus" %}\n本文\n{% /callout %}'.match(
      CALLOUT_PATTERN
    );

    expect(calloutFromBlock(match as RegExpMatchArray).type).toBe("info");
  });

  it("matches markdoc.config.mjs's attribute schema (type/title, matches Callout.astro props)", () => {
    const source =
      '{% callout type="danger" title="重要" %}\n複数行の\n本文\n{% /callout %}';
    const match = source.match(CALLOUT_PATTERN);

    expect(match).not.toBeNull();
    expect(calloutFromBlock(match as RegExpMatchArray)).toEqual({
      type: "danger",
      title: "重要",
      body: "複数行の\n本文",
    });
  });

  it("escapes HTML in the preview", () => {
    const html = calloutToPreview({
      type: "tip",
      title: '<script>alert("x")</script>',
      body: "body",
    });

    expect(html).not.toContain("<script>alert");
    expect(html).toContain("kw-callout--tip");
  });
});

describe("link-card editor component", () => {
  it("round-trips through toBlock → LINK_CARD_PATTERN → fromBlock", () => {
    const block = linkCardToBlock({
      href: "https://example.com/",
      title: "Example",
      description: "説明文",
    });
    const match = block.match(LINK_CARD_PATTERN);

    expect(match).not.toBeNull();
    expect(linkCardFromBlock(match as RegExpMatchArray)).toEqual({
      href: "https://example.com/",
      title: "Example",
      description: "説明文",
    });
  });

  it("omits description attribute when description is empty", () => {
    const block = linkCardToBlock({
      href: "https://example.com/",
      title: "Example",
    });

    expect(block).toBe(
      '{% link-card href="https://example.com/" title="Example" /%}'
    );
  });

  it("escapes HTML in the preview", () => {
    const html = linkCardToPreview({
      href: "https://example.com/",
      title: "<img src=x onerror=alert(1)>",
      description: "desc",
    });

    expect(html).not.toContain("<img src=x");
    expect(html).toContain("kw-link-card__title");
  });
});
