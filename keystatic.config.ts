import { collection, config, fields } from "@keystatic/core";

// 本番では GitHub mode (branch storage)、ローカル / Preview では local mode を使う。
// 環境変数で明示的に "github" を指定したときのみ GitHub mode に切り替える。
// 必須変数 (本番):
//   KEYSTATIC_STORAGE_KIND=github
//   KEYSTATIC_GITHUB_REPO_OWNER / KEYSTATIC_GITHUB_REPO_NAME
//   KEYSTATIC_GITHUB_CLIENT_ID / KEYSTATIC_GITHUB_CLIENT_SECRET / KEYSTATIC_SECRET
//   PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
// セットアップ手順は docs/cms-flow.md を参照。
const storageKind = process.env.KEYSTATIC_STORAGE_KIND ?? "local";
const storage =
  storageKind === "github"
    ? ({
        kind: "github",
        repo: {
          owner: process.env.KEYSTATIC_GITHUB_REPO_OWNER ?? "keroway",
          name: process.env.KEYSTATIC_GITHUB_REPO_NAME ?? "astro-blog",
        },
        branchPrefix: "keystatic/",
      } as const)
    : ({ kind: "local" } as const);

export default config({
  storage,

  collections: {
    blog: collection({
      label: "ブログ記事",
      slugField: "title",
      path: "src/content/blog/*",
      columns: ["title", "pubDate", "category", "draft"],
      schema: {
        title: fields.slug({ name: { label: "タイトル" } }),
        description: fields.text({ label: "概要", multiline: true }),
        pubDate: fields.date({ label: "公開日" }),
        updatedDate: fields.date({
          label: "更新日",
          validation: { isRequired: false },
        }),
        heroImage: fields.image({
          label: "ヒーロー画像",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: false },
        }),
        category: fields.text({
          label: "カテゴリ",
          validation: { isRequired: false },
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧",
          itemLabel: (props) => props.value || "タグ",
        }),
        draft: fields.checkbox({ label: "下書き", defaultValue: false }),
        ogImage: fields.text({
          label: "OG 画像 URL",
          validation: { isRequired: false },
        }),
        author: fields.text({
          label: "著者",
          validation: { isRequired: false },
        }),
        canonicalUrl: fields.text({
          label: "Canonical URL",
          validation: { isRequired: false },
        }),
        readingTime: fields.number({
          label: "読了時間（分）",
          validation: { isRequired: false, min: 0 },
        }),
      },
    }),

    works: collection({
      label: "Works",
      slugField: "title",
      path: "src/content/works/*",
      columns: ["title", "status", "featured"],
      schema: {
        title: fields.slug({ name: { label: "プロジェクト名" } }),
        description: fields.text({ label: "概要", multiline: true }),
        status: fields.select({
          label: "ステータス",
          options: [
            { label: "アクティブ", value: "active" },
            { label: "アーカイブ", value: "archived" },
            { label: "作業中", value: "wip" },
          ],
          defaultValue: "active",
        }),
        heroImage: fields.image({
          label: "ヒーロー画像",
          directory: "public/images/blog",
          publicPath: "/images/blog/",
          validation: { isRequired: false },
        }),
        repoUrl: fields.text({ label: "リポジトリ URL" }),
        lpUrl: fields.text({ label: "ランディングページ URL" }),
        demoUrl: fields.text({
          label: "デモ URL",
          validation: { isRequired: false },
        }),
        tags: fields.array(fields.text({ label: "タグ" }), {
          label: "タグ一覧",
          itemLabel: (props) => props.value || "タグ",
        }),
        createdAt: fields.date({ label: "作成日" }),
        updatedAt: fields.date({
          label: "更新日",
          validation: { isRequired: false },
        }),
        featured: fields.checkbox({
          label: "注目プロジェクト",
          defaultValue: false,
        }),
      },
    }),
  },
});
