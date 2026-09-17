import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { stripBom } from "./lib/strip-bom.ts";

const CONTENT_DIRS = [
  path.resolve(import.meta.dirname, "../src/content/blog"),
  path.resolve(import.meta.dirname, "../src/content/works"),
];

export const MAX_DESCRIPTION_LENGTH = 120;

type Issue = {
  file: string;
  length: number;
};

export function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (e) => e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".mdoc"))
    )
    .map((e) =>
      path.join(e.parentPath ?? (e as { path?: string }).path ?? dir, e.name)
    );
}

export function readDescriptionLength(filePath: string): number | null {
  const content = fs.readFileSync(filePath, "utf8");
  const match = stripBom(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const frontmatter = parse(match[1]) as { description?: unknown };
  const description = frontmatter?.description;
  if (typeof description !== "string") return null;
  return description.length;
}

function main() {
  const issues: Issue[] = [];
  let totalFiles = 0;

  for (const dir of CONTENT_DIRS) {
    const files = collectFiles(dir);
    totalFiles += files.length;
    for (const file of files) {
      const length = readDescriptionLength(file);
      if (length !== null && length > MAX_DESCRIPTION_LENGTH) {
        issues.push({ file, length });
      }
    }
  }

  const relPath = (p: string) =>
    path.relative(path.resolve(import.meta.dirname, ".."), p);

  if (issues.length === 0) {
    console.log(
      `✓ description の文字数上限 (${MAX_DESCRIPTION_LENGTH}文字) 超過なし (${totalFiles} ファイル走査済み)`
    );
    process.exit(0);
  }

  console.error(
    `\n❌ description が ${MAX_DESCRIPTION_LENGTH} 文字を超えているファイルが ${issues.length} 件見つかりました:\n`
  );
  for (const issue of issues) {
    console.error(`  ${relPath(issue.file)}: ${issue.length} 文字`);
  }
  console.error(
    `\n修正方法: description を ${MAX_DESCRIPTION_LENGTH} 文字以内に短縮してください（SEO の meta description / OGP / Twitter Card にそのまま使われるため）。`
  );
  process.exit(1);
}

if (import.meta.main) main();
