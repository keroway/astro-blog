import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// public/robots.txt: 各 User-agent グループは RFC 9309 §2.2.1 により
// 最も一致する自グループの指令のみを適用し、他グループ (ワイルドカードを含む) とは
// マージされない。answer engine 用に Allow: / を明示したグループが
// Disallow を持たないと、/admin//api//_vercel/ がそのグループにだけ
// 素通しされてしまう (#554 レビュー指摘)。各グループが必ず三経路を
// Disallow することを回帰的に保証する。
const robotsTxt = readFileSync(
  join(import.meta.dirname, "../public/robots.txt"),
  "utf8"
);

const REQUIRED_DISALLOWS = ["/admin/", "/api/", "/_vercel/"];

function parseGroups(text: string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  let currentAgent: string | null = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (key.trim().toLowerCase() === "user-agent") {
      currentAgent = value;
      if (!groups.has(currentAgent)) groups.set(currentAgent, []);
    } else if (currentAgent && key.trim().toLowerCase() === "disallow") {
      groups.get(currentAgent)?.push(value);
    }
  }
  return groups;
}

describe("robots.txt bot group isolation", () => {
  const groups = parseGroups(robotsTxt);

  it("defines at least one User-agent group", () => {
    expect(groups.size).toBeGreaterThan(0);
  });

  it("every User-agent group disallows /admin/, /api/, /_vercel/", () => {
    for (const [agent, disallows] of groups) {
      for (const path of REQUIRED_DISALLOWS) {
        expect(
          disallows.includes(path),
          `User-agent "${agent}" is missing "Disallow: ${path}"`
        ).toBe(true);
      }
    }
  });

  it("includes the answer-engine bots referenced in the AEO policy", () => {
    for (const agent of [
      "OAI-SearchBot",
      "ChatGPT-User",
      "PerplexityBot",
      "Perplexity-User",
      "Claude-SearchBot",
      "Claude-User",
      "*",
    ]) {
      expect(groups.has(agent)).toBe(true);
    }
  });
});
