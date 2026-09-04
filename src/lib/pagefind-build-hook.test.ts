import { describe, expect, it, vi } from "vitest";
import { runPagefindBuild } from "./pagefind-build-hook";

function makeLogger() {
  return { info: vi.fn(), error: vi.fn() };
}

describe("runPagefindBuild", () => {
  it("throws when createIndex returns no index (#719)", async () => {
    const logger = makeLogger();
    const createIndex = vi
      .fn()
      .mockResolvedValue({ index: undefined, errors: ["boom"] });

    await expect(
      runPagefindBuild({ outDir: "/dist", logger, createIndex })
    ).rejects.toThrow("インデックス作成に失敗しました");
    expect(logger.error).toHaveBeenCalledWith("boom");
  });

  it("throws when addDirectory reports errors (#719)", async () => {
    const logger = makeLogger();
    const createIndex = vi.fn().mockResolvedValue({
      index: {
        addDirectory: vi
          .fn()
          .mockResolvedValue({ page_count: 0, errors: ["add-fail"] }),
        writeFiles: vi.fn(),
      },
      errors: [],
    });

    await expect(
      runPagefindBuild({ outDir: "/dist", logger, createIndex })
    ).rejects.toThrow("ファイルのインデックス化に失敗しました");
    expect(logger.error).toHaveBeenCalledWith("add-fail");
  });

  it("throws when writeFiles reports errors (#719)", async () => {
    const logger = makeLogger();
    const createIndex = vi.fn().mockResolvedValue({
      index: {
        addDirectory: vi.fn().mockResolvedValue({ page_count: 3, errors: [] }),
        writeFiles: vi.fn().mockResolvedValue({
          outputPath: "/dist/pagefind",
          errors: ["write-fail"],
        }),
      },
      errors: [],
    });

    await expect(
      runPagefindBuild({ outDir: "/dist", logger, createIndex })
    ).rejects.toThrow("インデックスの書き込みに失敗しました");
    expect(logger.error).toHaveBeenCalledWith("write-fail");
  });

  it("resolves with page count and output path on success", async () => {
    const logger = makeLogger();
    const createIndex = vi.fn().mockResolvedValue({
      index: {
        addDirectory: vi.fn().mockResolvedValue({ page_count: 5, errors: [] }),
        writeFiles: vi
          .fn()
          .mockResolvedValue({ outputPath: "/dist/pagefind", errors: [] }),
      },
      errors: [],
    });

    await expect(
      runPagefindBuild({ outDir: "/dist", logger, createIndex })
    ).resolves.toEqual({ pageCount: 5, outputPath: "/dist/pagefind" });
    expect(logger.info).toHaveBeenCalledWith(
      "Pagefind: 5 ページをインデックス化 → /dist/pagefind"
    );
  });
});
