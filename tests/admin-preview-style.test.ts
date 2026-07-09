import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const adminPage = readFileSync(
  join(import.meta.dirname, "../src/pages/admin.astro"),
  "utf8"
);
const previewCss = readFileSync(
  join(import.meta.dirname, "../public/admin/preview.css"),
  "utf8"
);

describe("admin preview style guards", () => {
  it("registers preview.css before CMS initialization", () => {
    expect(adminPage).toContain(
      'CMS.registerPreviewStyle("/admin/preview.css")'
    );
  });

  it("keeps the preview stylesheet self-contained and article-oriented", () => {
    expect(previewCss).toContain("max-width: min(720px, 100%)");
    expect(previewCss).toContain('font-family: "BIZ UDPGothic"');
    expect(previewCss).toContain("@media (prefers-color-scheme: dark)");
    expect(previewCss).toContain("blockquote");
    expect(previewCss).toContain("table");
    expect(previewCss).not.toContain("@import './tokens.css'");
  });
});
