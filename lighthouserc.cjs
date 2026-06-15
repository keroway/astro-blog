// Lighthouse CI 設定
// - collect: 各 URL を 3 回計測 (スコアの揺らぎを抑制)
// - assert: accessibility / best-practices / seo >= 0.9 (error), performance >= 0.8 (warn)
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
