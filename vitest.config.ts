import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // astro:content は Astro ビルドパイプライン内でのみ動作する仮想モジュール。
    // vitest では スタブに差し替えて純関数テストを可能にする。
    alias: {
      "astro:content": new URL(
        "./src/lib/__mocks__/astro-content.ts",
        import.meta.url
      ).pathname,
    },
  },
  test: {
    // src/lib の純関数と、静的アセット/設定の軽量回帰テストを対象にする。
    // Astro コンポーネントや astro:content 依存コードは Playwright E2E で検証する。
    include: ["src/lib/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
});
