import fs from "node:fs";
import path from "node:path";

const CONTENT_DIRS = [
  path.resolve(import.meta.dirname, "../src/content/blog"),
  path.resolve(import.meta.dirname, "../src/content/works"),
];

const IMAGE_PATTERN = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;

const MIN_ALT_LENGTH = 4;
const PLACEHOLDER_ALTS = new Set([
  "enter image description here",
  "image",
  "img",
  "sample",
  "update",
]);
const TARGET_REMOTE_HOSTS = ["imgur.com", "googleusercontent.com"];

type Issue = {
  file: string;
  line: number;
  alt: string;
  src: string;
  reason: string;
  markdown: string;
};

function collectFiles(dir: string): string[] {
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

function isTargetRemoteHost(src: string): boolean {
  if (!/^https?:\/\//.test(src)) return false;
  try {
    const host = new URL(src).hostname;
    return TARGET_REMOTE_HOSTS.some(
      (target) => host === target || host.endsWith(`.${target}`)
    );
  } catch {
    return false;
  }
}

function altIssueReason(alt: string, src: string): string | null {
  const trimmed = alt.trim();
  if (trimmed.length < MIN_ALT_LENGTH)
    return `alt が ${MIN_ALT_LENGTH} 文字未満`;
  if (PLACEHOLDER_ALTS.has(trimmed.toLowerCase())) return "プレースホルダ alt";
  if (/^\d+$/.test(trimmed)) return "数値のみの alt";
  if (isTargetRemoteHost(src))
    return "外部ホスト画像（imgur/googleusercontent）";
  return null;
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
      const src = match[2].trim();
      const reason = altIssueReason(alt, src);
      if (reason) {
        issues.push({
          file: filePath,
          line: i + 1,
          alt,
          src,
          reason,
          markdown: match[0].slice(0, 120),
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
  `\n❌ alt / 画像参照の問題が ${allIssues.length} 件見つかりました:\n`
);

let currentFile = "";
for (const issue of allIssues) {
  const rel = relPath(issue.file);
  if (rel !== currentFile) {
    currentFile = rel;
    console.error(`  ${rel}`);
  }
  const altDisplay = issue.alt === "" ? "(空)" : `"${issue.alt}"`;
  console.error(
    `    L${issue.line}: ${issue.reason} / alt=${altDisplay} / src=${issue.src}`
  );
  console.error(`      ${issue.markdown}`);
}

console.error(`
修正方法:
- 各画像の ![...] に具体的な alt テキストを記入してください
- "/enter image description here/" や数値だけの alt は不可です
- imgur / googleusercontent の画像は public/ など自サイト管理下へ移設してください`);
process.exit(1);
