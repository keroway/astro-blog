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
    // src/lib の純関数のみ対象。Astro コンポーネントや astro:content 依存コードは
    // Playwright E2E で検証するため対象外とする。
    include: ["src/lib/**/*.test.ts"],
    environment: "node",
  },
});
