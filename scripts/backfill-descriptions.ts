import fs from "node:fs";
import path from "node:path";
import { query } from "@anthropic-ai/claude-agent-sdk";

const BLOG_DIR = path.resolve(import.meta.dirname, "../src/content/blog");
const DESCRIPTION_LINE = /^description:\s*".*"$/m;
const SCHEMA = {
  type: "object" as const,
  properties: {
    description: {
      type: "string",
      description:
        "記事の概要（日本語、50〜120文字以内、1〜2文。SEOのmeta description/OGP/Twitter Cardにそのまま使われるため厳守）",
    },
  },
  required: ["description"],
};

type Frontmatter = {
  title?: string;
  description?: string;
};

function stripBom(content: string): string {
  return content.replace(/^\uFEFF/, "");
}

function parseFrontmatter(content: string): Frontmatter {
  const match = stripBom(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const result: Frontmatter = {};
  for (const line of raw.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (!kv) continue;
    const [, key, val] = kv;
    const v = val.trim().replace(/^['"]|['"]$/g, "");
    if (key === "title") result.title = v;
    else if (key === "description") result.description = v;
  }
  return result;
}

function extractBody(content: string): string {
  return stripBom(content)
    .replace(/^---[\s\S]*?---\n/, "")
    .trim();
}

function replaceDescription(content: string, description: string): string {
  return content.replace(
    DESCRIPTION_LINE,
    `description: ${JSON.stringify(description)}`
  );
}

async function suggestDescription(filePath: string): Promise<string> {
  const content = fs.readFileSync(filePath, "utf8");
  const fm = parseFrontmatter(content);
  const body = extractBody(content);
  const bodyPreview =
    body.length > 4000 ? `${body.slice(0, 4000)}\n（以下省略）` : body;

  const prompt = `以下は日本語技術ブログ（keroway.com）の Markdown 記事です。

タイトル: ${fm.title ?? "（未設定）"}

--- 記事本文 ---
${bodyPreview}
--- 本文終了 ---

この記事に対する description を 1 件だけ提案してください。
- 日本語で 120 文字以内（50〜120 文字が目安。超過は不可）
- 検索結果や OGP/Twitter Card にそのまま使える要約（BaseHead.astro で truncate されずそのまま出力される）
- 誇張表現や不要な記号は避ける
- 記事の主要トピックと読者が得られる内容を具体的に含める`;

  let description = "";

  for await (const message of query({
    prompt,
    options: {
      outputFormat: {
        type: "json_schema",
        schema: SCHEMA,
      },
      allowedTools: [],
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      settingSources: ["project"],
    },
  })) {
    if (
      message.type === "result" &&
      message.subtype === "success" &&
      message.structured_output
    ) {
      description = String(
        (message.structured_output as { description?: string }).description ??
          ""
      ).trim();
    }
  }

  if (!description) {
    throw new Error(
      `${path.basename(filePath)} の description 生成に失敗しました`
    );
  }

  return description;
}

async function main() {
  const write = process.argv.includes("--write");
  const target = process.argv.find(
    (arg) =>
      !arg.startsWith("--") &&
      arg !== process.argv[0] &&
      arg !== process.argv[1]
  );

  const files = target
    ? [path.resolve(target)]
    : fs
        .readdirSync(BLOG_DIR)
        .filter((file) => file.endsWith(".md") || file.endsWith(".mdoc"))
        .map((file) => path.join(BLOG_DIR, file))
        .sort();

  const targets = files.filter((filePath) => {
    const content = fs.readFileSync(filePath, "utf8");
    return parseFrontmatter(content).description === "";
  });

  if (targets.length === 0) {
    console.log("更新対象はありません。");
    return;
  }

  for (const filePath of targets) {
    const content = fs.readFileSync(filePath, "utf8");
    const description = await suggestDescription(filePath);
    console.log(`\n# ${path.relative(process.cwd(), filePath)}`);
    console.log(description);
    if (write) {
      fs.writeFileSync(
        filePath,
        replaceDescription(content, description),
        "utf8"
      );
    }
  }

  console.log(
    `\n${write ? "✓ description を更新しました" : "✓ 提案を出力しました"}: ${targets.length} 件`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
