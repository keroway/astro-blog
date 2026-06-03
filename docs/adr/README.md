# Architecture Decision Records (ADR)

このディレクトリには、keroway.com の設計・技術選定に関するアーキテクチャ決定記録 (ADR) を管理します。

フォーマットは **MADR (Markdown Architectural Decision Records)** を採用しています。

## 連番ルール

| 番号 | カテゴリ | ファイル | ステータス |
|------|----------|---------|-----------|
| 0001 | CSS フレームワーク | [0001-css-framework.md](./0001-css-framework.md) | Proposed |
| 0002 | CMS / コンテンツ管理 | [0002-cms.md](./0002-cms.md) | Accepted (一部 0009 / 0010 で改定) |
| 0003 | レンダリング戦略 | [0003-rendering-strategy.md](./0003-rendering-strategy.md) | Superseded by 0005 |
| 0004 | メディア管理 | [0004-media-storage.md](./0004-media-storage.md) | Accepted |
| 0005 | Keystatic admin ランタイム | [0005-keystatic-admin-runtime.md](./0005-keystatic-admin-runtime.md) | Proposed |
| 0006 | CMS リポジトリ構成 | [0006-repo-structure.md](./0006-repo-structure.md) | Accepted |
| 0007 | モチーフ語彙の拡張 | [0007-motif-vocabulary-expansion.md](./0007-motif-vocabulary-expansion.md) | Accepted |
| 0008 | 記事作成補助の自動化 (Agent SDK) | [0008-agent-sdk-authoring-assist.md](./0008-agent-sdk-authoring-assist.md) | Accepted |
| 0009 | 本文 content フィールドの format (Markdoc) | [0009-content-authoring-format.md](./0009-content-authoring-format.md) | Accepted |
| 0010 | blog slug の ASCII 正規化 + 旧 URL リダイレクト | [0010-blog-slug-normalization.md](./0010-blog-slug-normalization.md) | Accepted |
| 0011 | モチーフ語彙に「道筋」を追加 | [0011-motif-road-path.md](./0011-motif-road-path.md) | Accepted |

## ADR の書き方

新しい ADR を追加する場合は、次の連番を割り当て、[MADR テンプレート](https://adr.github.io/madr/) に従って記述してください。

```
docs/adr/NNNN-<kebab-case-title>.md
```

ステータスは以下のいずれかを使用します:

- `Proposed` — 提案中
- `Accepted` — 採用
- `Deprecated` — 廃止（後継 ADR への参照を含める）
- `Superseded` — 別の ADR に置き換え済み
