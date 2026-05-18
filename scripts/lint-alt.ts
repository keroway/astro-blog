import fs from "node:fs";
import path from "node:path";

const CONTENT_DIRS = [
  path.resolve(import.meta.dirname, "../src/content/blog"),
  path.resolve(import.meta.dirname, "../src/content/works"),
];

const IMAGE_PATTERN = /!\[([^\]]*)\]\([^)]+\)/g;

const MIN_ALT_LENGTH = 4;

type Issue = {
  file: string;
  line: number;
  alt: string;
  markdown: string;
};

function collectFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter(
      (e) => e.isFile() && (e.name.endsWith(".md") || e.name.endsWith(".mdx"))
    )
    .map((e) =>
      path.join(e.parentPath ?? (e as { path?: string }).path ?? dir, e.name)
    );
}

function findAltIssues(filePath: string): Issue[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const issues: Issue[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    IMAGE_PATTERN.lastIndex = 0;
    let match = IMAGE_PATTERN.exec(line);
    while (match !== null) {
      const alt = match[1].trim();
      if (alt.length < MIN_ALT_LENGTH) {
        issues.push({
          file: filePath,
          line: i + 1,
          alt,
          markdown: match[0].slice(0, 80),
        });
      }
      match = IMAGE_PATTERN.exec(line);
    }
  }

  return issues;
}

const allIssues: Issue[] = [];
let totalFiles = 0;

for (const dir of CONTENT_DIRS) {
  const files = collectFiles(dir);
  totalFiles += files.length;
  for (const file of files) {
    allIssues.push(...findAltIssues(file));
  }
}

const relPath = (p: string) =>
  path.relative(path.resolve(import.meta.dirname, ".."), p);

if (allIssues.length === 0) {
  console.log(`✓ alt テキストの問題なし (${totalFiles} ファイル走査済み)`);
  process.exit(0);
}

console.error(
  `\n❌ alt が空または短い画像が ${allIssues.length} 件見つかりました:\n`
);

let currentFile = "";
for (const issue of allIssues) {
  const rel = relPath(issue.file);
  if (rel !== currentFile) {
    currentFile = rel;
    console.error(`  ${rel}`);
  }
  const altDisplay = issue.alt === "" ? "(空)" : `"${issue.alt}"`;
  console.error(`    L${issue.line}: alt=${altDisplay}  ${issue.markdown}`);
}

console.error(
  `\n修正方法: 各画像の ![...] に ${MIN_ALT_LENGTH} 文字以上の説明を記入してください。`
);
process.exit(1);
