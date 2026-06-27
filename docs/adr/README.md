# Architecture Decision Records (ADR)

このディレクトリには、keroway.com の設計・技術選定に関するアーキテクチャ決定記録 (ADR) を管理します。

フォーマットは **MADR (Markdown Architectural Decision Records)** を採用しています。

## 連番ルール

| 番号 | カテゴリ | ファイル | ステータス |
|------|----------|---------|-----------|
| 0001 | CSS フレームワーク | [0001-css-framework.md](./0001-css-framework.md) | Proposed |
| 0002 | CMS / コンテンツ管理 | [0002-cms.md](./0002-cms.md) | Accepted (一部 0009 / 0010 で改定。CMS ツール選定は 0016 で Sveltia へ移行・supersede 済み) |
| 0003 | レンダリング戦略 | [0003-rendering-strategy.md](./0003-rendering-strategy.md) | Superseded by 0005 |
| 0004 | メディア管理 | [0004-media-storage.md](./0004-media-storage.md) | Accepted |
| 0005 | Keystatic admin ランタイム | [0005-keystatic-admin-runtime.md](./0005-keystatic-admin-runtime.md) | Deprecated (Superseded by 0016) |
| 0006 | CMS リポジトリ構成 | [0006-repo-structure.md](./0006-repo-structure.md) | Accepted |
| 0007 | モチーフ語彙の拡張 | [0007-motif-vocabulary-expansion.md](./0007-motif-vocabulary-expansion.md) | Accepted |
| 0008 | 記事作成補助の自動化 (Agent SDK) | [0008-agent-sdk-authoring-assist.md](./0008-agent-sdk-authoring-assist.md) | Accepted |
| 0009 | 本文 content フィールドの format (Markdoc) | [0009-content-authoring-format.md](./0009-content-authoring-format.md) | Accepted |
| 0010 | blog slug の ASCII 正規化 + 旧 URL リダイレクト | [0010-blog-slug-normalization.md](./0010-blog-slug-normalization.md) | Accepted |
| 0011 | モチーフ語彙に「道筋」を追加 | [0011-motif-road-path.md](./0011-motif-road-path.md) | Accepted |
| 0012 | Tokaido Field Notes の視覚刷新 | [0012-tokaido-field-notes-refresh.md](./0012-tokaido-field-notes-refresh.md) | Accepted |
| 0013 | Web フォント自己ホスト化 | [0013-web-fonts-self-hosting.md](./0013-web-fonts-self-hosting.md) | Accepted |
| 0014 | Keystatic 管理 UI の Google Fonts 参照除去 | [0014-keystatic-google-fonts-removal.md](./0014-keystatic-google-fonts-removal.md) | Accepted |
| 0015 | 全文検索基盤 (Pagefind) | [0015-pagefind-search-platform.md](./0015-pagefind-search-platform.md) | Accepted |
| 0016 | CMS を Keystatic から Sveltia へ移行 | [0016-cms-keystatic-to-sveltia.md](./0016-cms-keystatic-to-sveltia.md) | Accepted |
| 0017 | Astro 7 へのメジャーアップグレード | [0017-astro-7-upgrade.md](./0017-astro-7-upgrade.md) | Accepted |
| 0018 | コンテンツ画像の astro:assets パイプライン移行 | [0018-astro-assets-media-pipeline.md](./0018-astro-assets-media-pipeline.md) | Proposed |

## ADR の書き方

新しい ADR を追加する場合は、次の連番を割り当て、[template.md](./template.md) をコピーして記述してください。

```
docs/adr/NNNN-<kebab-case-title>.md
```

ステータスは以下のいずれかを使用します:

- `Proposed` — 提案中
- `Accepted` — 採用
- `Deprecated` — 廃止（後継 ADR への参照を含める）
- `Superseded` — 別の ADR に置き換え済み

## テンプレートの構成

[template.md](./template.md) は以下のセクションで構成されます:

| セクション | 記載内容 |
|-----------|---------|
| **コンテキスト** | なぜこの決定が必要か。背景・制約・先行 ADR への参照 |
| **決定事項** | 何を決めたか（太字で端的に）+ *Rationale*（なぜその選択か） |
| **却下した候補** | 検討して退けた選択肢と退けた理由 |
| **Revisit When** | この決定を再検討すべき具体的なトリガ条件 |

## Revisit When の運用

`Revisit When` には「必要になったら」のような曖昧な条件を書かない。
「依存ライブラリのメジャーアップデート時」「トラフィックが X 倍になったとき」のように、
誰が読んでも再検討タイミングを判断できる具体的な条件を箇条書きで記す。

> 既存 ADR 0001〜0012 のフォーマット書き換えはスコープ外。
> 新規 ADR 起票時からこのテンプレートを使用すること。
