# 0020 — Scroll reveal は IntersectionObserver に一本化し、SDA (view()) には戻さない

- **ステータス**: Accepted
- **決定日**: 2026-07-22
- **決定者**: @keroway
- **関連 Issue**: [#587 トップページの下部セクションが間欠的に表示されない](https://github.com/keroway/astro-blog/issues/587)
- **関連 ADR**: なし（#499 / #513 は ADR 化されておらずコミット/Issue 履歴のみ）

---

## コンテキスト

`data-reveal` を持つ要素（トップページの hero / recent posts / works / focus areas など）は `html.kw-anim [data-reveal] { opacity: 0 }` で初期非表示にし、ビューポート進入時にフェードインさせる演出（issue #377）。この駆動方式は次の順で変遷した。

1. **#499（Scroll-Driven Animations 化）**: `CSS.supports('animation-timeline: view()')` に対応するブラウザ（Chrome 系）では `kw-scroll-timeline` クラスを付与し、CSS の `animation-timeline: view()` だけで reveal を駆動、`SiteLayout.astro` の IntersectionObserver パスをスキップする設計に変更。メインスレッド負荷ゼロを狙った perf 施策。
2. **#513（fold 内のみの対症療法）**: view-timeline の `entry` 進捗が初回ロード / reload / プリレンダ活性化時に解決されず、above-the-fold 要素が `opacity: 0` のまま固まる Chrome の既知バグが発覚。fold 内要素だけ `is-visible` を JS で即時付与し、CSS アニメーションを無効化する対症療法を追加。fold 外（下部セクション）は view() 依存のまま残した。
3. **#587（今回・本 ADR）**: fold 外セクションでも同種の間欠的非表示が再発。調査の結果、以下 3 つの根本原因を特定した。
   - `kw-scroll-timeline` 経路には fold 外向けの安全網が無く、view() の entry 進捗未解決バグに完全に晒されていた。
   - `kw-scroll-timeline` クラスは `BaseHead.astro` の head inline スクリプト 1 箇所でしか付与されず、Astro ClientRouter の swap で `<html>` の class が失われても再付与されない（`data-astro-rerun` 無し）。`kw-anim` 等は `astro:after-swap` で再付与されるのに非対称。View Transitions 遷移後の reveal 分岐が非決定的になっていた。
   - Speculation Rules によるプリレンダ中に `init()` が走ると `window.innerHeight` が 0 になりうる。

Firefox 等、常に IntersectionObserver パスを通るブラウザではこの種の間欠性は構造的に発生しない。症状は Chrome 系限定だった。

reveal には元々スクロールイベントハンドラが存在しない（IO はスクロールを監視するが hot path で処理を行わない）ため、#499 が狙った「メインスレッド負荷ゼロ」の実利は実質ゼロだった一方、上記のバグ・非対称性のコストだけが残っていた。

---

## 決定事項

**reveal (`data-reveal`) の駆動を `animation-timeline: view()` (SDA) から完全に撤去し、全ブラウザ IntersectionObserver に一本化する。**

- `BaseHead.astro` の `kw-scroll-timeline` クラス付与ロジックを削除。
- `global.css` の `.kw-scroll-timeline [data-reveal]` 系ルールと `@keyframes kw-reveal-in` を削除。
- `SiteLayout.astro` の `kw-scroll-timeline` 分岐を削除し、常に IntersectionObserver（`rootMargin: '0px 0px -10% 0px'`, `threshold: 0.05`）経路を使う。

*Rationale:* IO は初期交差状態を必ず配信する仕様であり、fold 内要素もスクロール無しで確実に reveal される。ブラウザ差異・swap 時のクラス非対称性・プリレンダのタイミング問題を構造的に排除でき、reveal に元々無かった perf 便益と引き換えに間欠バグを飼う理由が無い。

**ReadingProgress の named view-timeline（`--kw-post-scroll`、`BlogPost.astro` / `ReadingProgress.astro`）はこの決定の対象外で維持する。** こちらは実際にスクロール進捗を継続的に読むユースケースであり、`kw-scroll-timeline` クラスに依存していないため #587 の問題を引き起こしていない。

---

## 却下した候補

### 候補 A: `kw-scroll-timeline` に fold 外向けの IO フォールバックを追加する（#513 の延長）

**却下理由:** fold 内 / fold 外で二重のフォールバック機構を持つことになり複雑性が増す。かつ `kw-scroll-timeline` クラスの swap 時非付与問題（原因 2）は個別に直す必要があり、修正範囲が今回の一本化とほぼ同等になる。複雑性を増やして得られる perf 便益が無い。

### 候補 B: `kw-scroll-timeline` を `data-astro-rerun` 付きの script に変更し swap 時再付与のみ直す

**却下理由:** 原因 2（非対称性）のみを解消しても、原因 1（view() entry 進捗未解決バグ）と原因 3（プリレンダ）は残る。根本原因を残したまま表面症状だけ潰す対症療法になり、#513 と同じ轍を踏む。

---

## Revisit When

- ブラウザ側で view-timeline の `entry` 進捗が初回ロード/reload/プリレンダ活性化時に確実に解決されるようになったと標準仕様レベルで確認でき、かつ swap 時のクラス再付与を含めた実装を安全に用意できる見通しが立ったとき。
- reveal に実際のスクロールイベントハンドラ（continuous な進捗読み取りなど）を追加する要件が生まれ、IO では実現できない perf 上のボトルネックが計測で示されたとき。
- 上記のいずれも無い限り、「perf のため view() に戻そう」という提案はこの ADR の却下理由（候補 A / B）を再読してから検討すること。
