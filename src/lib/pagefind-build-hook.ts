import path from "node:path";

interface PagefindLogger {
  info: (message: string) => void;
  error: (message: string) => void;
}

interface PagefindIndex {
  addDirectory: (opts: { path: string }) => Promise<{
    page_count: number;
    errors: unknown[];
  }>;
  writeFiles: (opts: { outputPath: string }) => Promise<{
    outputPath: string;
    errors: unknown[];
  }>;
}

interface PagefindCreateIndexResult {
  index: PagefindIndex | undefined;
  errors: unknown[];
}

interface RunPagefindBuildOptions {
  outDir: string;
  logger: PagefindLogger;
  createIndex: () => Promise<PagefindCreateIndexResult>;
}

/**
 * Pagefind のインデックス生成 (createIndex → addDirectory → writeFiles) を実行する。
 * いずれかの段階が失敗したら throw する — astro:build:done から呼ぶことで
 * `astro build` 自体を非0終了にし、検索インデックス欠落のまま build 成功扱いに
 * ならないようにする (#719)。
 */
export async function runPagefindBuild({
  outDir,
  logger,
  createIndex,
}: RunPagefindBuildOptions): Promise<{
  pageCount: number;
  outputPath: string;
}> {
  const { index, errors: createErrors } = await createIndex();
  if (!index) {
    for (const e of createErrors) logger.error(String(e));
    throw new Error("Pagefind: インデックス作成に失敗しました");
  }

  const { page_count, errors: addErrors } = await index.addDirectory({
    path: outDir,
  });
  if (addErrors.length) {
    for (const e of addErrors) logger.error(String(e));
    throw new Error("Pagefind: ファイルのインデックス化に失敗しました");
  }

  const { outputPath, errors: writeErrors } = await index.writeFiles({
    outputPath: path.join(outDir, "pagefind"),
  });
  if (writeErrors.length) {
    for (const e of writeErrors) logger.error(String(e));
    throw new Error("Pagefind: インデックスの書き込みに失敗しました");
  }

  logger.info(`Pagefind: ${page_count} ページをインデックス化 → ${outputPath}`);
  return { pageCount: page_count, outputPath };
}
