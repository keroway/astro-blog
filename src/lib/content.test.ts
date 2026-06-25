import { describe, expect, it } from "vitest";
import type { BlogEntry, WorksEntry } from "../types/content";
import {
  calculateReadingTime,
  getRelatedPosts,
  pickFeaturedWorks,
} from "./content";

// ──────────────────────────────────────────────────────────────────
// ヘルパ: テスト用の最小エントリを生成
// ──────────────────────────────────────────────────────────────────
function makeBlogEntry(
  id: string,
  overrides: Partial<BlogEntry["data"]> = {}
): BlogEntry {
  return {
    id,
    body: () => Promise.resolve("本文"),
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

function makeWorksEntry(
  id: string,
  overrides: Partial<WorksEntry["data"]> = {}
): WorksEntry {
  return {
    id,
    body: () => Promise.resolve("本文"),
    collection: "works",
    data: {
      title: `Works ${id}`,
      description: `説明 ${id}`,
      status: "active" as const,
      lpUrl: "https://example.com",
      tags: ["TypeScript"],
      createdAt: new Date("2024-01-01"),
      featured: false,
      ...overrides,
    },
    render: async () => ({
      Content: () => null,
      headings: [],
      remarkPluginFrontmatter: {},
    }),
  } as unknown as WorksEntry;
}

// ──────────────────────────────────────────────────────────────────
// calculateReadingTime
// ──────────────────────────────────────────────────────────────────
describe("calculateReadingTime", () => {
  it("空文字列は最小 1 分を返す", () => {
    expect(calculateReadingTime("")).toBe(1);
  });

  it("400 文字未満は 1 分を返す", () => {
    expect(calculateReadingTime("a".repeat(399))).toBe(1);
  });

  it("ちょうど 400 文字は 1 分を返す", () => {
    expect(calculateReadingTime("a".repeat(400))).toBe(1);
  });

  it("401 文字は 2 分を返す", () => {
    expect(calculateReadingTime("a".repeat(401))).toBe(2);
  });

  it("800 文字は 2 分を返す", () => {
    expect(calculateReadingTime("a".repeat(800))).toBe(2);
  });

  it("フロントマターブロックは文字数に含めない", () => {
    const frontmatter = "---\ntitle: Test\n---\n";
    const body = "a".repeat(400);
    // フロントマター込みでも本文 400 文字 → 1 分
    expect(calculateReadingTime(frontmatter + body)).toBe(1);
  });

  it("長文は切り上げで計算する", () => {
    // 1200 文字 / 400 = 3.0 → 3 分
    expect(calculateReadingTime("a".repeat(1200))).toBe(3);
    // 1201 文字 → 4 分
    expect(calculateReadingTime("a".repeat(1201))).toBe(4);
  });
});

// ──────────────────────────────────────────────────────────────────
// getRelatedPosts
// ──────────────────────────────────────────────────────────────────
describe("getRelatedPosts", () => {
  it("自分自身を含まない", () => {
    const post = makeBlogEntry("a", { category: "dev", tags: ["ts"] });
    const all = [post, makeBlogEntry("b", { category: "dev", tags: ["ts"] })];
    const result = getRelatedPosts(post, all);
    expect(result.every((p) => p.id !== "a")).toBe(true);
  });

  it("category 一致 > tag 一致 の優先順で返す", () => {
    const post = makeBlogEntry("target", { category: "dev", tags: ["ts"] });
    const sameCatTag = makeBlogEntry("both", {
      category: "dev",
      tags: ["ts"],
      pubDate: new Date("2024-01-01"),
    });
    const sameCatOnly = makeBlogEntry("catOnly", {
      category: "dev",
      tags: [],
      pubDate: new Date("2024-01-02"),
    });
    const sameTagOnly = makeBlogEntry("tagOnly", {
      category: "hardware",
      tags: ["ts"],
      pubDate: new Date("2024-01-03"),
    });
    const unrelated = makeBlogEntry("none", {
      category: "reading",
      tags: [],
    });

    const all = [post, sameCatTag, sameCatOnly, sameTagOnly, unrelated];
    const result = getRelatedPosts(post, all, 3);

    // スコア: sameCatTag(2+1=3), sameCatOnly(2), sameTagOnly(1), none(0,除外)
    expect(result[0].id).toBe("both");
    expect(result[1].id).toBe("catOnly");
    expect(result[2].id).toBe("tagOnly");
  });

  it("スコア 0 の記事は除外し最新記事で補完する", () => {
    const post = makeBlogEntry("target", { category: "dev", tags: [] });
    const unrelated1 = makeBlogEntry("u1", {
      category: "reading",
      tags: [],
      pubDate: new Date("2024-06-01"),
    });
    const unrelated2 = makeBlogEntry("u2", {
      category: "reading",
      tags: [],
      pubDate: new Date("2024-05-01"),
    });
    const all = [post, unrelated1, unrelated2];
    const result = getRelatedPosts(post, all, 2);
    // 関連なし → 最新 2 件で補完
    expect(result.map((p) => p.id)).toEqual(["u1", "u2"]);
  });

  it("limit を超えない", () => {
    const post = makeBlogEntry("target", { category: "dev", tags: ["ts"] });
    const others = Array.from({ length: 10 }, (_, i) =>
      makeBlogEntry(`p${i}`, { category: "dev", tags: ["ts"] })
    );
    const result = getRelatedPosts(post, [post, ...others], 3);
    expect(result).toHaveLength(3);
  });

  it("同点は pubDate 降順になる", () => {
    const post = makeBlogEntry("target", { category: "dev", tags: [] });
    const old = makeBlogEntry("old", {
      category: "dev",
      pubDate: new Date("2023-01-01"),
    });
    const newP = makeBlogEntry("new", {
      category: "dev",
      pubDate: new Date("2024-06-01"),
    });
    const result = getRelatedPosts(post, [post, old, newP], 2);
    expect(result[0].id).toBe("new");
    expect(result[1].id).toBe("old");
  });
});

// ──────────────────────────────────────────────────────────────────
// pickFeaturedWorks
// ──────────────────────────────────────────────────────────────────
describe("pickFeaturedWorks", () => {
  it("featured が 1 件以上あればそれだけを返す", () => {
    const w1 = makeWorksEntry("a", { featured: true });
    const w2 = makeWorksEntry("b", { featured: false });
    const w3 = makeWorksEntry("c", { featured: true });
    expect(pickFeaturedWorks([w1, w2, w3], 10).map((w) => w.id)).toEqual([
      "a",
      "c",
    ]);
  });

  it("featured が 0 件なら全件を返す", () => {
    const works = [
      makeWorksEntry("a"),
      makeWorksEntry("b"),
      makeWorksEntry("c"),
    ];
    expect(pickFeaturedWorks(works, 10)).toHaveLength(3);
  });

  it("limit を超えない", () => {
    const works = Array.from({ length: 10 }, (_, i) =>
      makeWorksEntry(`w${i}`, { featured: true })
    );
    expect(pickFeaturedWorks(works, 3)).toHaveLength(3);
  });

  it("空配列は空配列を返す", () => {
    expect(pickFeaturedWorks([], 5)).toHaveLength(0);
  });
});
