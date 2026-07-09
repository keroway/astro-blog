# CMS UI 回帰確認チェックリスト

- **対象**: `/admin/` (Sveltia CMS)
- **関連**: [CMS UI 改善メモ](./cms-ui.md)

## 自動スモーク

```bash
pnpm run test:admin
```

`test:admin` は Playwright 専用ポート (`4335`) と `CI=1` を使って
毎回テスト用 Astro サーバーを起動する。別リポジトリの dev サーバーを
誤って再利用しないため、管理画面回帰確認ではこのコマンドを優先する。

確認する内容:

- `/admin/` が表示できる
- 初期画面の主要 CTA が日本語で表示される
- 推奨導線「ローカルリポジトリで編集」が見える
- CMS の使い方メモが表示される

## 手動確認

Sveltia CMS の更新、`public/admin/theme.css` の変更、`public/admin/config.yml` の変更時は次を確認する。

### ログイン画面

- [ ] 画面上のブランドが `keroway CMS` として認識できる
- [ ] `ローカルリポジトリで編集` が最も目立つ
- [ ] `GitHub でサインイン` と `アクセストークンでサインイン` は副次導線に見える
- [ ] 375px / 768px / 1280px で補助メモが主要操作を隠さない

### コレクション一覧

- [ ] `ブログ記事` と `制作物` のラベルが表示される
- [ ] 一覧の検索、ソート、グループ表示が操作できる
- [ ] ボタンの hover / focus / disabled 状態が破綻していない

### 編集画面

- [ ] 保存・作成系アクションが primary に見える
- [ ] プレビュー・公開・メディア系アクションが secondary に見える
- [ ] キャンセル・閉じる・戻る系アクションが subtle に見える
- [ ] 削除・破棄系アクションが danger に見える
- [ ] ブログの「下書きにする」などの checkbox / toggle が縦長ピルにならず、正方形に近い寸法で表示される
- [ ] プレビュー本文が中央寄せされ、本文幅・見出しサイズ・リンク色が本番記事に近い
- [ ] フォーカスリングがキーボード操作で見える

### アクセシビリティ

- [ ] `Tab` のみでローカルリポジトリ編集・GitHub ログイン・アクセストークンの各ボタンに到達できる
- [ ] フォーカスリングが色のみに依存せず見える（outline + halo）
- [ ] `data-keroway-admin-action` の primary/secondary/subtle/danger が色以外（太字・枚数）でも区別できる
- [ ] 本体サイトで `theme=dark` / `theme=light` を切り替えた後、`/admin/` も同じテーマで開く
- [ ] `prefers-reduced-motion: reduce` でホバー移動などの motion が抹消される
- [ ] `pnpm run test:admin` が green
- [ ] Sveltia CMS 本体の DOM に起因する除外ルール（`tests/playwright/admin-a11y.spec.ts` 先頭コメント参照）以外の新規違反がない

### 更新時の記録

UI に見える変更をした PR では、代表画面のスクリーンショットまたは確認メモを PR description に残す。
