import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TOKENS_PATH = path.join(ROOT, "src/styles/tokens.css");
const DOC_PATH = path.join(ROOT, "docs/design-system.md");
const TOKENS_REL = path.relative(ROOT, TOKENS_PATH);
const DOC_REL = path.relative(ROOT, DOC_PATH);

type CssToken = { name: string; value: string; line: number };
type DocRow = { name: string; cols: string[]; line: number };
type Problem = { file: string; line: number; message: string };

export function parseCssBlock(
  lines: string[],
  startLineExact: string,
  label: string
): { tokens: CssToken[]; semanticMarkerLine: number } {
  const start = lines.findIndex((l) => l.trim() === startLineExact);
  if (start === -1) {
    throw new Error(
      `${label} ブロック開始行 (\`${startLineExact}\`) が ${TOKENS_REL} に見つかりません`
    );
  }
  const tokens: CssToken[] = [];
  let semanticMarkerLine = -1;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === "}") break;
    if (line.includes("/* ---- Semantic ---- */")) semanticMarkerLine = i + 1;
    const m = /--kw-([\w-]+):\s*([^;]+);/.exec(line);
    if (m) tokens.push({ name: m[1], value: m[2].trim(), line: i + 1 });
  }
  return { tokens, semanticMarkerLine };
}

export function extractDocTableRows(
  lines: string[],
  sectionHeadingRegex: RegExp
): DocRow[] {
  const start = lines.findIndex((l) => sectionHeadingRegex.test(l));
  if (start === -1) {
    throw new Error(
      `見出し ${sectionHeadingRegex} が ${DOC_REL} に見つかりません`
    );
  }
  const rows: DocRow[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^#{2,3}\s/.test(line)) break;
    if (!line.startsWith("|")) continue;
    const cols = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cols.length < 2) continue;
    const tokenMatch = /^`(--kw-[\w-]+)`$/.exec(cols[0]);
    if (!tokenMatch) continue;
    rows.push({ name: tokenMatch[1].slice("--kw-".length), cols, line: i + 1 });
  }
  return rows;
}

export function stripBackticks(s: string): string {
  return s.replace(/^`|`$/g, "");
}

export function computeProblems(
  cssText: string,
  docText: string,
  tokensFileLabel = TOKENS_REL,
  docFileLabel = DOC_REL
): {
  problems: Problem[];
  primitiveDocRows: DocRow[];
  summaryDocRows: DocRow[];
} {
  const cssLines = cssText.split("\n");
  const docLines = docText.split("\n");

  const light = parseCssBlock(cssLines, '[data-theme="light"] {', "light");
  const dark = parseCssBlock(cssLines, '[data-theme="dark"] {', "dark");

  if (light.semanticMarkerLine === -1) {
    throw new Error(
      `\`/* ---- Semantic ---- */\` マーカーが ${tokensFileLabel} の light ブロックに見つかりません`
    );
  }

  const lightMap = new Map(light.tokens.map((t) => [t.name, t.value]));
  const darkMap = new Map(dark.tokens.map((t) => [t.name, t.value]));
  const primitiveNames = new Set(
    light.tokens
      .filter((t) => t.line < light.semanticMarkerLine)
      .map((t) => t.name)
  );
  const allCssColorNames = new Set(light.tokens.map((t) => t.name));

  const primitiveDocRows = extractDocTableRows(
    docLines,
    /^### 1\.1 プリミティブカラー/
  );
  const summaryDocRows = extractDocTableRows(
    docLines,
    /^### カラートークン（light \/ dark）/
  );

  const problems: Problem[] = [];

  // §1.1: プリミティブトークンの欠落・余剰・値不一致
  const primitiveDocNames = new Set(primitiveDocRows.map((r) => r.name));
  for (const name of primitiveNames) {
    if (!primitiveDocNames.has(name)) {
      const cssLine = light.tokens.find((t) => t.name === name)?.line ?? 0;
      problems.push({
        file: tokensFileLabel,
        line: cssLine,
        message: `--kw-${name} が design-system.md §1.1 プリミティブカラー表に見つかりません（欠落）`,
      });
    }
  }
  for (const row of primitiveDocRows) {
    if (!primitiveNames.has(row.name)) {
      problems.push({
        file: docFileLabel,
        line: row.line,
        message: `--kw-${row.name} は §1.1 に記載されていますが tokens.css のプリミティブ層に見つかりません（余剰）`,
      });
      continue;
    }
    const docLight = stripBackticks(row.cols[1] ?? "");
    const docDark = stripBackticks(row.cols[2] ?? "");
    const cssLight = lightMap.get(row.name) ?? "";
    const cssDark = darkMap.get(row.name) ?? "";
    if (docLight !== cssLight) {
      problems.push({
        file: docFileLabel,
        line: row.line,
        message: `--kw-${row.name} の light 値が不一致（doc: \`${docLight}\` / tokens.css: \`${cssLight}\`）`,
      });
    }
    if (docDark !== cssDark) {
      problems.push({
        file: docFileLabel,
        line: row.line,
        message: `--kw-${row.name} の dark 値が不一致（doc: \`${docDark}\` / tokens.css: \`${cssDark}\`）`,
      });
    }
  }

  // §5: 全カラートークンの欠落・余剰（種別ではなく名前のみ突き合わせ）
  const summaryDocNames = new Set(summaryDocRows.map((r) => r.name));
  for (const name of allCssColorNames) {
    if (!summaryDocNames.has(name)) {
      const cssLine = light.tokens.find((t) => t.name === name)?.line ?? 0;
      problems.push({
        file: tokensFileLabel,
        line: cssLine,
        message: `--kw-${name} が design-system.md §5 のトークン変数表に見つかりません（欠落）`,
      });
    }
  }
  for (const row of summaryDocRows) {
    if (!allCssColorNames.has(row.name)) {
      problems.push({
        file: docFileLabel,
        line: row.line,
        message: `--kw-${row.name} は §5 に記載されていますが tokens.css に見つかりません（余剰）`,
      });
    }
  }

  return { problems, primitiveDocRows, summaryDocRows };
}

function main() {
  const cssText = fs.readFileSync(TOKENS_PATH, "utf8");
  const docText = fs.readFileSync(DOC_PATH, "utf8");

  const { problems, primitiveDocRows, summaryDocRows } = computeProblems(
    cssText,
    docText
  );

  if (problems.length === 0) {
    console.log(
      `✓ tokens.css と design-system.md のカラートークンは一致しています (§1.1: ${primitiveDocRows.length} 件 / §5: ${summaryDocRows.length} 件)`
    );
    process.exit(0);
  }

  console.error(
    `\n❌ tokens.css と design-system.md のカラートークンに ${problems.length} 件の乖離が見つかりました:\n`
  );
  for (const p of problems) {
    console.error(`  ${p.file}:${p.line}: ${p.message}`);
  }
  console.error(
    "\n修正方法: src/styles/tokens.css の値と docs/design-system.md §1.1 / §5 の表を突き合わせて一致させてください。"
  );
  process.exit(1);
}

if (import.meta.main) main();
