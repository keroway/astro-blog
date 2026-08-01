import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const themeCss = readFileSync(
  join(import.meta.dirname, "../public/admin/theme.css"),
  "utf8"
);

describe("admin theme checkbox regression guards", () => {
  it("excludes checkbox/radio/switch roles from generic button sizing rules", () => {
    expect(themeCss).toContain(
      'button:not([role="checkbox"]):not([role="radio"]):not([role="switch"])'
    );
  });

  it("defines published Sveltia checkbox theme tokens", () => {
    expect(themeCss).toContain("--sui-checkbox-background-color:");
    expect(themeCss).toContain("--sui-checkbox-background-color-checked:");
    expect(themeCss).toContain("--sui-checkbox-border-color:");
    expect(themeCss).toContain("--sui-checkbox-border-color-checked:");
    expect(themeCss).toContain("--sui-checkbox-border-radius:");
    expect(themeCss).toContain("--sui-checkbox-foreground-color-checked:");
  });
});

describe("admin theme font regression guards (issue #622)", () => {
  it("routes CMS fonts through the Astro Fonts API variables with a fallback", () => {
    expect(themeCss).toContain("--cms-font-display: var(--font-display,");
    expect(themeCss).toContain("--cms-font-body: var(--font-body,");
    expect(themeCss).toContain("--cms-font-mono: var(--font-mono,");
  });

  it("does not reference Zen Maru Gothic (OG image generation only, not page text)", () => {
    expect(themeCss).not.toContain("Zen Maru Gothic");
  });

  it("forces Sveltia's own font tokens with !important (Sveltia re-declares them later in the cascade)", () => {
    expect(themeCss).toContain(
      "--sui-font-family-default: var(--cms-font-body) !important;"
    );
    expect(themeCss).toContain(
      "--sui-font-family-monospace: var(--cms-font-mono) !important;"
    );
    expect(themeCss).toContain(
      "--sui-heading-font-family: var(--cms-font-display) !important;"
    );
  });
});

describe("admin theme dark mode guard (issue #622)", () => {
  it("switches theme via [data-theme] only, not prefers-color-scheme", () => {
    expect(themeCss).toContain(':root[data-theme="dark"]');
    expect(themeCss).not.toContain("@media (prefers-color-scheme: dark)");
  });
});
