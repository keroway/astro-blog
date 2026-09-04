import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, execFileSync: vi.fn() };
});

describe("generateSlug / getTodayIso / parseArgs", () => {
  it("ASCII タイトルから kebab-case slug を生成する", async () => {
    const { generateSlug } = await import("./new-post");
    expect(generateSlug("My Article")).toBe("my-article");
  });

  it("--suggest フラグを検出する", async () => {
    const { parseArgs } = await import("./new-post");
    expect(parseArgs(["node", "new-post.ts", "Title", "--suggest"])).toEqual({
      title: "Title",
      slug: null,
      suggest: true,
    });
  });
});

describe("runSuggestFrontmatter", () => {
  beforeEach(() => {
    vi.mocked(execFileSync).mockReset();
  });

  it("子プロセス成功時は true を返す", async () => {
    vi.mocked(execFileSync).mockReturnValue(Buffer.from(""));
    const { runSuggestFrontmatter } = await import("./new-post");
    expect(runSuggestFrontmatter("/tmp/dummy.mdoc")).toBe(true);
  });

  it("子プロセス失敗時は false を返す (例外を握りつぶさない)", async () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("boom");
    });
    const { runSuggestFrontmatter } = await import("./new-post");
    expect(runSuggestFrontmatter("/tmp/dummy.mdoc")).toBe(false);
  });
});

describe("new-post --suggest の終了コード (統合テスト)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "new-post-test-"));
    fs.mkdirSync(path.join(tmpDir, "scripts"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, "src/content/blog"), { recursive: true });
    fs.copyFileSync(
      path.join(process.cwd(), "scripts/new-post.ts"),
      path.join(tmpDir, "scripts/new-post.ts")
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("suggest-frontmatter が非 0 終了なら new-post も非 0 終了し、下書きは残る", () => {
    fs.writeFileSync(
      path.join(tmpDir, "scripts/suggest-frontmatter.ts"),
      "process.exit(1);\n"
    );

    const result = spawnSync(
      "node",
      [
        "--experimental-strip-types",
        "scripts/new-post.ts",
        "Test Title",
        "--slug",
        "test-title",
        "--suggest",
      ],
      { cwd: tmpDir, encoding: "utf-8" }
    );

    expect(result.status).not.toBe(0);
    expect(
      fs.existsSync(path.join(tmpDir, "src/content/blog/test-title.mdoc"))
    ).toBe(true);
  });

  it("suggest-frontmatter が成功すれば new-post も 0 終了する", () => {
    fs.writeFileSync(
      path.join(tmpDir, "scripts/suggest-frontmatter.ts"),
      "process.exit(0);\n"
    );

    const result = spawnSync(
      "node",
      [
        "--experimental-strip-types",
        "scripts/new-post.ts",
        "Test Title",
        "--slug",
        "test-title-ok",
        "--suggest",
      ],
      { cwd: tmpDir, encoding: "utf-8" }
    );

    expect(result.status).toBe(0);
    expect(
      fs.existsSync(path.join(tmpDir, "src/content/blog/test-title-ok.mdoc"))
    ).toBe(true);
  });
});
