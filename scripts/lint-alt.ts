import fs from "node:fs";
import path from "node:path";

const CONTENT_DIRS = [
  path.resolve(import.meta.dirname, "../src/content/blog"),
  path.resolve(import.meta.dirname, "../src/content/works"),
];

// alt 内の対応した角括弧（例: ![説明 [補足 [詳細]]](src)）は Markdoc が alt の
// 一部として画像ノードにする。正規表現は再帰できないため、深さを固定して展開する。
const ALT_BRACKET_DEPTH = 5;
const ALT_BODY = (() => {
  let body = String.raw`[^\[\]]`;
  for (let depth = 0; depth < ALT_BRACKET_DEPTH; depth++) {
    body = String.raw`(?:[^\[\]]|\[${body}*\])`;
  }
  return body;
})();
const IMAGE_INLINE_PATTERN = new RegExp(
  String.raw`!\[(${ALT_BODY}*)\]\(\s*(<[^>\n]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)`,
  "g"
);
const IMAGE_REFERENCE_PATTERN = new RegExp(
  String.raw`!\[(${ALT_BODY}*)\]\[([^\]]*)\]`,
  "g"
);
const IMAGE_SHORTCUT_PATTERN = new RegExp(
  String.raw`!\[(${ALT_BODY}+)\](?!\(|\[)`,
  "g"
);
const REFERENCE_DEFINITION_PATTERN = /^\s{0,3}\[([^\]]+)\]:\s*(\S+)/;
// URL が次の行に置かれた定義（`[label]:` だけの行 + 次行に URL）
const REFERENCE_LABEL_ONLY_PATTERN = /^\s{0,3}\[([^\]]+)\]:\s*$/;
// フェンスはリスト項目（`- ` / `1. `）や引用（`>`）の内側にも置ける。
// 開始行の前置マーカーを容器として記録し、後続行が容器を継続しなくなった時点で
// フェンスも終了したものとして扱う。
const CONTAINER_PREFIX_PATTERN =
  /^\s{0,3}(?:(>)[ \t]?|(?:[-+*]|\d{1,9}[.)])([ \t]+))/;
const FENCE_OPEN_PATTERN = /^\s{0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE_PATTERN = /^\s{0,3}(`{3,}|~{3,})\s*$/;
const INLINE_CODE_SPAN_PATTERN = /(`+).*?\1/g;

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
  const url = src.replace(/^<(.*)>$/, "$1");
  if (!/^https?:\/\//.test(url)) return false;
  try {
    const host = new URL(url).hostname;
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

export function maskInlineCodeSpans(line: string): string {
  INLINE_CODE_SPAN_PATTERN.lastIndex = 0;
  return line.replace(INLINE_CODE_SPAN_PATTERN, (match) =>
    " ".repeat(match.length)
  );
}

type Container = { kind: "quote" } | { kind: "list"; indent: number };
type FenceOpen = { char: string; length: number; containers: Container[] };

function parseFenceOpen(line: string): FenceOpen | null {
  const containers: Container[] = [];
  let rest = line;
  for (;;) {
    const prefix = rest.match(CONTAINER_PREFIX_PATTERN);
    if (!prefix) break;
    if (prefix[1] === ">") {
      containers.push({ kind: "quote" });
    } else {
      const spaces = prefix[2].length > 4 ? 1 : prefix[2].length;
      const indent = prefix[0].length - prefix[2].length + spaces;
      containers.push({ kind: "list", indent });
      rest = rest.slice(prefix[0].length - prefix[2].length + spaces);
      continue;
    }
    rest = rest.slice(prefix[0].length);
  }
  const fence = rest.match(FENCE_OPEN_PATTERN);
  if (!fence) return null;
  return { char: fence[1][0], length: fence[1].length, containers };
}

// 行が容器を継続していれば容器分を除いた残りを返す。継続していなければ null。
function stripContainers(line: string, containers: Container[]): string | null {
  let rest = line;
  for (const container of containers) {
    if (container.kind === "quote") {
      const m = rest.match(/^\s{0,3}>[ \t]?/);
      if (!m) return null;
      rest = rest.slice(m[0].length);
    } else {
      if (rest.trim() === "") continue;
      const leading = (rest.match(/^ */) as RegExpMatchArray)[0].length;
      if (leading < container.indent) return null;
      rest = rest.slice(container.indent);
    }
  }
  return rest;
}

function findFencedCodeLines(lines: string[]): boolean[] {
  const inCode: boolean[] = [];
  let open: FenceOpen | null = null;
  for (const line of lines) {
    if (open !== null) {
      const rest = stripContainers(line, open.containers);
      if (rest !== null) {
        inCode.push(true);
        const close = rest.match(FENCE_CLOSE_PATTERN);
        if (
          close &&
          close[1][0] === open.char &&
          close[1].length >= open.length
        ) {
          open = null;
        }
        continue;
      }
      // 容器が終わった行でフェンスも終了し、その行は通常行として再判定する
      open = null;
    }
    open = parseFenceOpen(line);
    inCode.push(open !== null);
  }
  return inCode;
}

function normalizeLabel(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

function collectReferenceDefinitions(
  lines: string[],
  inCode: boolean[]
): Map<string, string> {
  const refs = new Map<string, string>();
  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    let label: string;
    let src: string;
    const match = lines[i].match(REFERENCE_DEFINITION_PATTERN);
    if (match) {
      label = normalizeLabel(match[1]);
      src = match[2].trim();
    } else {
      const labelOnly = lines[i].match(REFERENCE_LABEL_ONLY_PATTERN);
      const next = lines[i + 1]?.trim();
      if (!labelOnly || !next || inCode[i + 1]) continue;
      label = normalizeLabel(labelOnly[1]);
      src = next.split(/\s+/)[0];
    }
    // Markdoc の描画は同じラベルの最初の定義を採用する
    if (!refs.has(label)) refs.set(label, src);
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

  // 複数行にまたがる画像記法を拾うため、コード行を空白化した全文に対して
  // インライン記法を照合し、一致位置から元の行番号を求める。
  const maskedLines = lines.map((line, i) =>
    inCode[i] ? " ".repeat(line.length) : maskInlineCodeSpans(line)
  );
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of maskedLines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }
  const lineNumberAt = (position: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= position) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const maskedText = maskedLines.join("\n");
  IMAGE_INLINE_PATTERN.lastIndex = 0;
  let inlineMatch = IMAGE_INLINE_PATTERN.exec(maskedText);
  while (inlineMatch !== null) {
    // 空行は段落区切りで、画像記法はそれをまたげない
    if (!/\n[ \t]*\n/.test(inlineMatch[0])) {
      pushIssue(
        lineNumberAt(inlineMatch.index),
        inlineMatch[1].trim(),
        inlineMatch[2].trim(),
        inlineMatch[0].replace(/\s*\n\s*/g, " ")
      );
    }
    inlineMatch = IMAGE_INLINE_PATTERN.exec(maskedText);
  }

  for (let i = 0; i < lines.length; i++) {
    if (inCode[i]) continue;
    const line = maskedLines[i];

    IMAGE_REFERENCE_PATTERN.lastIndex = 0;
    let refMatch = IMAGE_REFERENCE_PATTERN.exec(line);
    while (refMatch !== null) {
      const alt = refMatch[1].trim();
      const src = refs.get(normalizeLabel(refMatch[2].trim() || alt));
      if (src !== undefined) pushIssue(i + 1, alt, src, refMatch[0]);
      refMatch = IMAGE_REFERENCE_PATTERN.exec(line);
    }

    IMAGE_SHORTCUT_PATTERN.lastIndex = 0;
    let shortcutMatch = IMAGE_SHORTCUT_PATTERN.exec(line);
    while (shortcutMatch !== null) {
      const alt = shortcutMatch[1].trim();
      const src = refs.get(normalizeLabel(alt));
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
