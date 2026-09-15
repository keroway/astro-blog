import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { BLOG_CATEGORIES, WORKS_STATUSES } from "../src/lib/content-schema.ts";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG_PATH = path.join(ROOT, "public/admin/config.yml");
const CONFIG_REL = path.relative(ROOT, CONFIG_PATH);
const SCHEMA_REL = path.relative(
  ROOT,
  path.join(ROOT, "src/lib/content-schema.ts")
);

type Problem = { message: string };

function findCollectionField(
  config: unknown,
  collectionName: string,
  fieldName: string
): { options: Array<{ value: string }> } | undefined {
  const collections = (config as { collections?: unknown[] })?.collections;
  if (!Array.isArray(collections)) return undefined;
  const collection = collections.find(
    (c) => (c as { name?: string })?.name === collectionName
  ) as { fields?: unknown[] } | undefined;
  if (!collection || !Array.isArray(collection.fields)) return undefined;
  return collection.fields.find(
    (f) => (f as { name?: string })?.name === fieldName
  ) as { options: Array<{ value: string }> } | undefined;
}

export function computeProblems(
  configText: string,
  blogCategories: readonly string[] = BLOG_CATEGORIES,
  worksStatuses: readonly string[] = WORKS_STATUSES
): Problem[] {
  const config = parse(configText);
  const problems: Problem[] = [];

  const checks: Array<{
    collection: string;
    field: string;
    schemaValues: readonly string[];
    schemaLabel: string;
  }> = [
    {
      collection: "blog",
      field: "category",
      schemaValues: blogCategories,
      schemaLabel: "BLOG_CATEGORIES",
    },
    {
      collection: "works",
      field: "status",
      schemaValues: worksStatuses,
      schemaLabel: "WORKS_STATUSES",
    },
  ];

  for (const check of checks) {
    const field = findCollectionField(config, check.collection, check.field);
    if (!field) {
      problems.push({
        message: `${CONFIG_REL} の collections[${check.collection}] に ${check.field} フィールドが見つかりません`,
      });
      continue;
    }
    const configValues = field.options.map((o) => o.value);
    const configSet = new Set(configValues);
    const schemaSet = new Set(check.schemaValues);

    for (const value of check.schemaValues) {
      if (!configSet.has(value)) {
        problems.push({
          message: `${SCHEMA_REL} の ${check.schemaLabel} に含まれる "${value}" が ${CONFIG_REL} の ${check.collection}.${check.field}.options に見つかりません（欠落）`,
        });
      }
    }
    for (const value of configValues) {
      if (!schemaSet.has(value)) {
        problems.push({
          message: `${CONFIG_REL} の ${check.collection}.${check.field}.options に含まれる "${value}" が ${SCHEMA_REL} の ${check.schemaLabel} に見つかりません（余剰）`,
        });
      }
    }
  }

  return problems;
}

function main() {
  const configText = fs.readFileSync(CONFIG_PATH, "utf8");
  const problems = computeProblems(configText);

  if (problems.length === 0) {
    console.log(
      `✓ ${CONFIG_REL} のカテゴリ/ステータス選択肢は ${SCHEMA_REL} と一致しています`
    );
    process.exit(0);
  }

  console.error(
    `\n❌ ${CONFIG_REL} と ${SCHEMA_REL} のカテゴリ/ステータス選択肢に ${problems.length} 件の乖離が見つかりました:\n`
  );
  for (const p of problems) {
    console.error(`  ${p.message}`);
  }
  console.error(
    `\n修正方法: ${CONFIG_REL} の options 一覧と ${SCHEMA_REL} の定数を突き合わせて一致させてください。`
  );
  process.exit(1);
}

if (import.meta.main) main();
