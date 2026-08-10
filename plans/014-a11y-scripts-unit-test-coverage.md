<!-- markdownlint-disable MD013 MD060 -->

# Plan 014: `src/scripts/` のアクセシビリティ設定ロジックに単体テストを追加する

> **Executor instructions**: 1 項目 1 コミットで進める。On any STOP condition, stop and report. When done, update `plans/README.md`.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: —
- **Category**: テストの手薄な領域
- **Planned at**: commit `779ffd0`, 2026-08-10（beamsg worker による調査、team=astro-blog-self）

## Background

`src/scripts/` 配下の4ファイルは `localStorage` の読み書きと `document.documentElement` への class 切り替えという、ユーザーのアクセシビリティ設定（文字サイズ・モーション低減・下線・字間）を永続化する中核ロジックを持つ:

- `font-size.ts`（49行）— `getFontSize` / `applyFontSizePreference` / `setFontSize`
- `reduce-motion.ts`（106行）
- `text-spacing.ts`（39行）
- `underline-links.ts`（39行）

いずれもエクスポートされた関数は `document` / `localStorage` にのみ依存する（Astro コンポーネント本体や `astro:content` には依存しない）ため、DOM 環境さえあれば `src/lib` と同じパターンで単体テスト可能。しかし `vitest.config.ts` の `include` は `src/lib/**/*.test.ts` と `tests/**/*.test.ts` のみを対象にしており、`src/scripts/` にはテストが1件も存在しない。Playwright 側も `tests/playwright/mobile-header.spec.ts` が `#a11y-trigger` ボタンの可視性を確認する程度で、設定の永続化・再読み込み後の復元といった実際のロジックはどのテスト層でも検証されていない。

現状の `vitest.config.ts` は `environment: "node"` のグローバル設定のみで、`document` / `localStorage` に依存するテストを追加するには jsdom（または happy-dom）が必要（`package.json` に未導入、確認済み）。

## Scope

**In scope**:
- `src/scripts/font-size.test.ts`, `reduce-motion.test.ts`, `text-spacing.test.ts`, `underline-links.test.ts` の新規追加
- jsdom（または happy-dom、どちらか軽量な方）を devDependencies に追加
- `vitest.config.ts` の `test.environment` をファイル単位で切り替える（`// @vitest-environment jsdom` の per-file pragma を使い、`src/lib/**` の既存 node 環境テストに影響を与えない）か、`include` を `src/scripts/**/*.test.ts` にも広げた上で環境を分離する

**Out of scope**: `src/components/StampRally.astro` 等インタラクティブコンポーネントの Playwright spec 追加（見つかった別課題だが、`.astro` の script タグ全体を対象にする調査・実装コストが本 plan と別スコープになるため、必要なら別 issue として起票する）。`vitest.config.ts` へのカバレッジ閾値導入（同様に別課題）。

## Done criteria

- [ ] 4ファイル分のテストが追加され、`localStorage` 未初期化時のデフォルト値・設定変更後の class 切り替え・再読み込み時の復元（`applyFontSizePreference` 相当の関数がある場合）をカバーする。
- [ ] `localStorage` アクセスが例外を投げる環境（プライベートブラウジング等を模した try/catch 分岐）のフォールバック挙動もケースに含める。
- [ ] `pnpm run test:unit` が新規テストを含めて pass する。
- [ ] 既存の `src/lib/**/*.test.ts`（node 環境前提）が環境変更の影響を受けず pass し続ける。
- [ ] `plans/README.md` の Plan 014 行を更新。

## STOP conditions

- jsdom 導入が `pnpm-workspace.yaml` の `minimumReleaseAgeStrict` 等サプライチェーン保護に引っかかり即座に入れられない場合 → happy-dom で代替を検討し、それでも詰まる場合は状況を報告して保留。
- per-file pragma と `include` 拡張のどちらでも既存 node 環境テストとの共存が技術的に難しいと判明した場合 → 別 `vitest.*.config.ts` の分離構成が必要かどうかを判断材料として報告し、実装は保留。
