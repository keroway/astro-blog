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
    // src/lib の純関数、src/scripts の a11y 設定ロジック、静的アセット/設定の
    // 軽量回帰テストを対象にする。Astro コンポーネントや astro:content 依存コードは
    // Playwright E2E で検証する。
    // src/scripts/**/*.test.ts は document/localStorage に依存するため、
    // 各ファイル先頭の `@vitest-environment happy-dom` docblock で個別に happy-dom を使う
    // (このプロジェクト全体の既定は node のまま、src/lib 側への影響を避ける)。
    include: [
      "src/lib/**/*.test.ts",
      "src/scripts/**/*.test.ts",
      "tests/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    environment: "node",
  },
});
