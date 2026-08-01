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
    expect(previewCss).toContain('var(--font-body, "BIZ UDPGothic"');
    expect(previewCss).toContain("blockquote");
    expect(previewCss).toContain("table");
    expect(previewCss).not.toContain("@import './tokens.css'");
  });

  it("switches theme via [data-theme] only, mirrored from the parent document (issue #622)", () => {
    expect(previewCss).toContain(':root[data-theme="dark"]');
    expect(previewCss).not.toContain("@media (prefers-color-scheme: dark)");
  });
});

describe("admin preview font injection guards (issue #622)", () => {
  it("extracts @font-face rules from the page's <style> tags and injects them into the preview iframe as raw CSS", () => {
    expect(adminPage).toContain('.filter((css) => css.includes("@font-face"))');
    expect(adminPage).toContain(
      "CMS.registerPreviewStyle(fontFaceCss, { raw: true })"
    );
  });
});

describe("admin preview theme sync guards (issue #622)", () => {
  it("mirrors the parent <html data-theme> onto the preview iframe document", () => {
    expect(adminPage).toContain("iframe.preview");
    expect(adminPage).toContain("doc.documentElement.dataset.theme = theme");
  });
});
