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
