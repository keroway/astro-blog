import { afterEach, describe, expect, it } from "vitest";
import type { BlogEntry, WorksEntry } from "../types/content";
import { setMockCollection } from "./__mocks__/astro-content";
import {
  calculateReadingTime,
  getAllCategories,
  getAllTags,
  getPublishedPosts,
  getRelatedPosts,
  getSortedWorks,
  getTokaidoProgress,
  getTotalWritingChars,
  pickFeaturedWorks,
  resolveWorksDate,
} from "./content";

afterEach(() => {
  setMockCollection("blog", []);
  setMockCollection("works", []);
});

// ──────────────────────────────────────────────────────────────────
// ヘルパ: テスト用の最小エントリを生成
// ──────────────────────────────────────────────────────────────────
function makeBlogEntry(
  id: string,
  overrides: Partial<BlogEntry["data"]> = {},
  bodyText = "本文"
): BlogEntry {
  return {
    id,
    body: bodyText,
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

// ──────────────────────────────────────────────────────────────────
// getPublishedPosts
// ──────────────────────────────────────────────────────────────────
describe("getPublishedPosts", () => {
  const now = new Date("2024-06-15");

  it("draft: true の記事は除外する", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", { draft: true, pubDate: new Date("2024-01-01") }),
      makeBlogEntry("b", { draft: false, pubDate: new Date("2024-01-01") }),
    ]);
    const result = await getPublishedPosts(now);
    expect(result.map((p) => p.id)).toEqual(["b"]);
  });

  it("pubDate === now の記事は含む", async () => {
    setMockCollection("blog", [makeBlogEntry("a", { pubDate: now })]);
    const result = await getPublishedPosts(now);
    expect(result.map((p) => p.id)).toEqual(["a"]);
  });

  it("pubDate > now (未来予約) の記事は除外する", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", { pubDate: new Date("2024-06-16") }),
    ]);
    const result = await getPublishedPosts(now);
    expect(result).toHaveLength(0);
  });

  it("pubDate 降順で返す", async () => {
    setMockCollection("blog", [
      makeBlogEntry("old", { pubDate: new Date("2024-01-01") }),
      makeBlogEntry("new", { pubDate: new Date("2024-05-01") }),
    ]);
    const result = await getPublishedPosts(now);
    expect(result.map((p) => p.id)).toEqual(["new", "old"]);
  });
});

// ──────────────────────────────────────────────────────────────────
// getTotalWritingChars
// ──────────────────────────────────────────────────────────────────
describe("getTotalWritingChars", () => {
  it("公開済み記事の本文文字数を合計する", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", { pubDate: new Date("2024-01-01") }, "a".repeat(10)),
      makeBlogEntry("b", { pubDate: new Date("2024-01-01") }, "b".repeat(20)),
    ]);
    const total = await getTotalWritingChars(new Date("2024-06-15"));
    expect(total).toBe(30);
  });

  it("draft 記事は文字数に含めない", async () => {
    setMockCollection("blog", [
      makeBlogEntry(
        "a",
        { draft: true, pubDate: new Date("2024-01-01") },
        "a".repeat(100)
      ),
      makeBlogEntry("b", { pubDate: new Date("2024-01-01") }, "b".repeat(10)),
    ]);
    const total = await getTotalWritingChars(new Date("2024-06-15"));
    expect(total).toBe(10);
  });

  it("frontmatter ブロックは文字数から除く", async () => {
    setMockCollection("blog", [
      makeBlogEntry(
        "a",
        { pubDate: new Date("2024-01-01") },
        `---\ntitle: Test\n---\n${"a".repeat(50)}`
      ),
    ]);
    const total = await getTotalWritingChars(new Date("2024-06-15"));
    expect(total).toBe(50);
  });

  it("記事が無ければ 0 を返す", async () => {
    setMockCollection("blog", []);
    const total = await getTotalWritingChars(new Date("2024-06-15"));
    expect(total).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────
// getTokaidoProgress
// ──────────────────────────────────────────────────────────────────
describe("getTokaidoProgress", () => {
  it("記事が無ければ progress は 0", async () => {
    setMockCollection("blog", []);
    const result = await getTokaidoProgress(new Date("2024-06-15"));
    expect(result).toEqual({
      totalChars: 0,
      totalReadingMinutes: 0,
      riTraveled: 0,
      progress: 0,
    });
  });

  it("既知の文字数から里数・進捗率を換算する", async () => {
    // 400 文字 → 1 分 → 66.67m → 66.67/3927 里
    setMockCollection("blog", [
      makeBlogEntry("a", { pubDate: new Date("2024-01-01") }, "a".repeat(400)),
    ]);
    const result = await getTokaidoProgress(new Date("2024-06-15"));
    expect(result.totalChars).toBe(400);
    expect(result.totalReadingMinutes).toBeCloseTo(1);
    expect(result.riTraveled).toBeCloseTo(4000 / 60 / 3927, 6);
    expect(result.progress).toBeCloseTo(result.riTraveled / 123.5, 6);
  });

  it("progress は 1 を超えない (上限クランプ)", async () => {
    setMockCollection("blog", [
      makeBlogEntry(
        "a",
        { pubDate: new Date("2024-01-01") },
        "a".repeat(400 * 400 * 400)
      ),
    ]);
    const result = await getTokaidoProgress(new Date("2024-06-15"));
    expect(result.progress).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────
// resolveWorksDate
// ──────────────────────────────────────────────────────────────────
describe("resolveWorksDate", () => {
  it("updatedAt があればそれを優先する", () => {
    const work = makeWorksEntry("a", {
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-06-01"),
    });
    expect(resolveWorksDate(work)).toEqual(new Date("2024-06-01"));
  });

  it("updatedAt が無ければ createdAt を使う", () => {
    const work = makeWorksEntry("a", {
      createdAt: new Date("2024-01-01"),
      updatedAt: undefined,
    });
    expect(resolveWorksDate(work)).toEqual(new Date("2024-01-01"));
  });
});

// ──────────────────────────────────────────────────────────────────
// getSortedWorks
// ──────────────────────────────────────────────────────────────────
describe("getSortedWorks", () => {
  it("resolveWorksDate の降順で返す", async () => {
    setMockCollection("works", [
      makeWorksEntry("old", { createdAt: new Date("2024-01-01") }),
      makeWorksEntry("new", {
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-06-01"),
      }),
    ]);
    const result = await getSortedWorks();
    expect(result.map((w) => w.id)).toEqual(["new", "old"]);
  });
});

// ──────────────────────────────────────────────────────────────────
// getAllTags
// ──────────────────────────────────────────────────────────────────
describe("getAllTags", () => {
  const now = new Date("2024-06-15");

  it("公開済み記事のタグを重複排除・50音順で返す", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", {
        pubDate: new Date("2024-01-01"),
        tags: ["typescript", "astro"],
      }),
      makeBlogEntry("b", {
        pubDate: new Date("2024-01-01"),
        tags: ["astro", "vercel"],
      }),
    ]);
    const result = await getAllTags(now);
    expect(result).toEqual(["astro", "typescript", "vercel"]);
  });

  it("draft 記事のタグは含めない", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", {
        draft: true,
        pubDate: new Date("2024-01-01"),
        tags: ["hidden"],
      }),
    ]);
    const result = await getAllTags(now);
    expect(result).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────
// getAllCategories
// ──────────────────────────────────────────────────────────────────
describe("getAllCategories", () => {
  const now = new Date("2024-06-15");

  it("使用中のカテゴリを BLOG_CATEGORIES の定義順で返す", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", {
        pubDate: new Date("2024-01-01"),
        category: "tools",
      }),
      makeBlogEntry("b", { pubDate: new Date("2024-01-01"), category: "dev" }),
    ]);
    const result = await getAllCategories(now);
    // BLOG_CATEGORIES の定義順は dev, hardware, tools, reading, event
    expect(result).toEqual(["dev", "tools"]);
  });

  it("draft 記事のカテゴリは含めない", async () => {
    setMockCollection("blog", [
      makeBlogEntry("a", {
        draft: true,
        pubDate: new Date("2024-01-01"),
        category: "dev",
      }),
    ]);
    const result = await getAllCategories(now);
    expect(result).toEqual([]);
  });

  it("未使用のカテゴリは含めない", async () => {
    setMockCollection("blog", []);
    const result = await getAllCategories(now);
    expect(result).toEqual([]);
  });
});
