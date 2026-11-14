/**
 * /admin の先読みスクリプト (テーマ初期値と Sveltia CMS の prefs 書き込み)。
 *
 * Sveltia CMS は `import CMS from "@sveltia/cms"` の評価時点で自身の prefs
 * (localStorage["sveltia-cms.prefs"]) をメモリへ読み込むため、その import より前に
 * 実行されている必要がある。admin.astro が同期 classic script として CMS の module script
 * より前に読み込む。以前はインラインスクリプトだったが、CSP の script-src から
 * 'unsafe-inline' を外すため (#819 / ADR 0021) 外部ファイルにした。
 */
(() => {
  let theme = "light";

  // Sveltia CMS 自身の prefs (localStorage["sveltia-cms.prefs"]) が
  // dataset.theme を上書きするより先に、サイト本体の設定を初期値として
  // 反映しておく (CMS.init() 前の FOUC 防止用の先読みヒント)。
  try {
    const stored = localStorage.getItem("theme");
    theme =
      stored === "dark" || stored === "light"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
  } catch {}

  // Sveltia CMS は「import CMS from "@sveltia/cms"」の評価時点で自身の
  // prefs (localStorage["sveltia-cms.prefs"]) をメモリに読み込むため、
  // それより後 (下の module script 内) で書き込んでも間に合わない。
  // ここで import 前に書き込み、ja ロケールとテーマを固定する
  // (issue #622)。対応するキー・スキーマがなければ黙って握りつぶし、
  // navigator.language / Sveltia 既定のフォールバックに委ねる。
  try {
    const PREFS_KEY = "sveltia-cms.prefs";
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");

    prefs.locale ??= "ja";
    prefs.theme = theme;
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
})();
