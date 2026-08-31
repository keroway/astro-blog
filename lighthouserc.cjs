// Lighthouse CI 設定
// - collect: 各 URL を 3 回計測 (スコアの揺らぎを抑制)
// - assert: accessibility / best-practices / seo >= 0.9 (error), performance >= 0.8 (warn)
// - performance は意図的に warn のまま (品質ゲートではなく監視値、#688):
//   GitHub Actions の共有 runner は CPU/ネットワーク負荷が実行ごとに変動し、
//   performance スコアだけが他カテゴリよりノイズが大きい。error に昇格すると
//   実装に問題がなくても runner 負荷でジョブが赤くなる (フレーキー化) リスクがある。
//   回帰の検知は `lhci-reports` の artifact を都度確認する運用とする。
// - upload: filesystem (外部 LHCI server なし)
module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist/client",
      numberOfRuns: 3,
      url: [
        "http://localhost/",
        "http://localhost/blog/",
        "http://localhost/blog/book-pragmatic-programmer/",
        // heroImage + 本文画像が多い詳細ページを継続監視する (#480)。
        "http://localhost/blog/rust-on-codeanywhere/",
        "http://localhost/about/",
        "http://localhost/works/",
        "http://localhost/works/timeline-dsl/",
      ],
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:performance": ["warn", { minScore: 0.8 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lhci-reports",
    },
  },
};
