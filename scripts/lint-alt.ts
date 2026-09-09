import fs from "node:fs";
import path from "node:path";

const CONTENT_DIRS = [
  path.resolve(import.meta.dirname, "../src/content/blog"),
  path.resolve(import.meta.dirname, "../src/content/works"),
];

const IMAGE_INLINE_PATTERN =
  /!\[([^\]]*)\]\(([^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\)/g;
const IMAGE_REFERENCE_PATTERN = /!\[([^\]]*)\]\[([^\]]*)\]/g;
const IMAGE_SHORTCUT_PATTERN = /!\[([^\]]+)\](?!\(|\[)/g;
const REFERENCE_DEFINITION_PATTERN = /^\s{0,3}\[([^\]]+)\]:\s*(\S+)/;
const FENCE_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;

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

export function isTargetRemoteHost(src: string): boolean {
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

export function altIssueReason(alt: string, src: string): string | null {
  const trimmed = alt.trim();
  if (trimmed.length < MIN_ALT_LENGTH)
    return `alt が ${MIN_ALT_LENGTH} 文字未満`;
  if (PLACEHOLDER_ALTS.has(trimmed.toLowerCase())) return "プレースホルダ alt";
  if (/^\d+$/.test(trimmed)) return "数値のみの alt";
  if (isTargetRemoteHost(src))
    return "外部ホスト画像（imgur/googleusercontent）";
  return null;
}

function findFencedCodeLines(lines: string[]): boolean[] {
  const inCode: boolean[] = [];
  let fenceChar: string | null = null;
  for (const line of lines) {
    const fenceMatch = line.match(FENCE_PATTERN);
    if (fenceMatch && (fenceChar === null || fenceMatch[1][0] === fenceChar)) {
      inCode.push(true);
      fenceChar = fenceChar === null ? fenceMatch[1][0] : null;
      continue;
    }
    inCode.push(fenceChar !== null);
  }
  return inCode;
}

function collectReferenceDefinitions(
  lines: string[],
  inCode: boolean[]
): Map<string, string> {
  const refs = new Map<string, string>();
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const match = lines[i].match(REFERENCE_DEFINITION_PATTERN);
    if (match) refs.set(match[1].trim().toLowerCase(), match[2].trim());
  }
  return refs;
}

export function findAltIssues(filePath: string): Issue[] {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const inCode = findFencedCodeLines(lines);
  const refs = collectReferenceDefinitions(lines, inCode);
  const issues: Issue[] = [];

  const pushIssue = (
    lineNumber: number,
    alt: string,
    src: string,
    markdown: string
  ) => {
    const reason = altIssueReason(alt, src);
    if (reason) {
      issues.push({
        file: filePath,
        line: lineNumber,
        alt,
        src,
        reason,
        markdown: markdown.slice(0, 120),
      });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const line = lines[i];

    IMAGE_INLINE_PATTERN.lastIndex = 0;
    let inlineMatch = IMAGE_INLINE_PATTERN.exec(line);
    while (inlineMatch !== null) {
      pushIssue(
        i + 1,
        inlineMatch[1].trim(),
        inlineMatch[2].trim(),
        inlineMatch[0]
      );
      inlineMatch = IMAGE_INLINE_PATTERN.exec(line);
    }

    IMAGE_REFERENCE_PATTERN.lastIndex = 0;
    let refMatch = IMAGE_REFERENCE_PATTERN.exec(line);
    while (refMatch !== null) {
      const alt = refMatch[1].trim();
      const label = (refMatch[2].trim() || alt).toLowerCase();
      const src = refs.get(label);
      if (src !== undefined) pushIssue(i + 1, alt, src, refMatch[0]);
      refMatch = IMAGE_REFERENCE_PATTERN.exec(line);
    }

    IMAGE_SHORTCUT_PATTERN.lastIndex = 0;
    let shortcutMatch = IMAGE_SHORTCUT_PATTERN.exec(line);
    while (shortcutMatch !== null) {
      const alt = shortcutMatch[1].trim();
      const src = refs.get(alt.toLowerCase());
      if (src !== undefined) pushIssue(i + 1, alt, src, shortcutMatch[0]);
      shortcutMatch = IMAGE_SHORTCUT_PATTERN.exec(line);
    }
  }

  return issues;
}

function main() {
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
}

if (import.meta.main) main();
