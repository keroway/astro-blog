<!-- markdownlint-disable MD013 MD060 -->

# Plan 013: Sveltia CMS の URL フィールドにパターン検証を追加する

> **Executor instructions**: 1 コミットで完結する想定（設定ファイルのみ）。On any STOP condition, stop and report. When done, update `plans/README.md`.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: —
- **Category**: CMS スキーマと実装の乖離
- **Planned at**: commit `779ffd0`, 2026-08-10（beamsg worker による調査、team=astro-blog-self）

## Background

`src/content.config.ts` は次の4フィールドを Zod の `z.url()` で検証している（21, 33-35行目）:

- `blog.canonicalUrl`（optional）
- `works.repoUrl`（optional）
- `works.lpUrl`（required）
- `works.demoUrl`（optional）

一方 `public/admin/config.yml` 側ではこれら4フィールドがすべて `widget: string`（167-168, 250-262行目）として定義されており、CMS 入力画面では URL 形式のバリデーションが一切効かない。

Sveltia CMS は Decap CMS 互換で `url` 専用ウィジェットを持たない（ctx7 で `/sveltia/sveltia-cms` を確認済み）。`string` / `text` ウィジェットは `pattern: [regex, errorMessage]` という `FieldValidationProps` をサポートしており、これで代替する。

**症状**: CMS 上で空白混じりの文字列やスキームなしの値（例: `example.com` や `not a url`）を保存しても Sveltia はエラーを出さない。git にコミットされた後、`pnpm run build`（`astro check` の Zod パース）で初めて失敗し、記事執筆者にとっては CMS 上で気づけない late failure になる。

## Scope

**In scope**: `public/admin/config.yml` の4フィールド（`canonicalUrl`, `repoUrl`, `lpUrl`, `demoUrl`）に `pattern` を追加する。

**Out of scope**: 他のフィールドのバリデーション強化、Sveltia CMS 自体のカスタムウィジェット開発、`content.config.ts` 側の変更（Zod 側は既に正しいので変更不要）。

## Implementation notes

- 正規表現は `content.config.ts` の `z.url()` と完全一致させる必要はない（Zod 側が最終防衛線であることに変わりはない）。CMS 側は「明らかに URL でない入力を早期に弾く」ためのゆるいゲートで十分。例: `^https?://\S+$`
- エラーメッセージは日本語で（他の CMS フィールドのラベル・UI が日本語のため）。例: `"http(s):// で始まる URL を入力してください"`
- `lpUrl` は required なので `pattern` と `required: true` の両方が効くことを確認する。

## Done criteria

- [ ] `public/admin/config.yml` の4フィールドに `pattern` が追加されている。
- [ ] `/admin` を起動し、`lpUrl` に `not-a-url` のような不正な値を入力すると保存前にエラー表示されることを目視確認する（`pnpm run dev` → `/admin`）。
- [ ] 既存の正当な URL 値（例: `https://github.com/keroway/astro-blog`）で保存が通ることを確認する。
- [ ] `pnpm run test:admin`（CMS admin スモーク + a11y）が pass する。
- [ ] `plans/README.md` の Plan 013 行を更新。

## STOP conditions

- Sveltia CMS の `pattern` が実際には期待通り動作しない（既知のバグ等）と判明した場合 → ctx7 で再確認の上、代替案（例: config.yml の説明文にフォーマットを明記するだけに留める）を提案して報告し、実装は保留。
