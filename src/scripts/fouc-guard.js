/**
 * FOUC ガード (テーマ / モーション低減 / 文字サイズ / テキスト間隔 / リンク下線)。
 *
 * 初回描画の前に <html> へクラスと data-theme を付ける。以前は BaseHead.astro の
 * インラインスクリプトだったが、CSP の script-src から 'unsafe-inline' を外すため
 * (#819 / ADR 0021) 外部ファイルにした。BaseHead が `?url` で受け取った
 * ハッシュ付き URL を、同期 (defer / async / module なし) の classic script として
 * <head> 先頭で読み込む。module や defer にすると描画後に実行されて FOUC が戻る。
 *
 * localStorage のキーは src/scripts/*.ts と一致させること。
 */
(() => {
  let s = null;
  try {
    s = localStorage.getItem("theme");
  } catch {}
  try {
    const t =
      s === "dark" || s === "light"
        ? s
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = t;
  } catch {}
  // モーション低減の判定 (手動設定 OR OS 設定)。
  // キー 'reduce-motion' は src/scripts/reduce-motion.ts と一致させること。
  let reduced = false;
  try {
    reduced = localStorage.getItem("reduce-motion") === "true";
  } catch {}
  if (reduced) document.documentElement.classList.add("reduce-motion");
  try {
    if (!reduced && window.matchMedia) {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
  } catch {}
  // スクロール演出 (issue #377) の初期非表示は kw-anim でゲートする。
  // モーション許可時のみ初回描画前に付与し、チラつきを避ける。
  if (!reduced) document.documentElement.classList.add("kw-anim");
  // 文字サイズ (issue #390)。キー 'font-size' は src/scripts/font-size.ts と一致させること。
  try {
    const fs = localStorage.getItem("font-size");
    if (fs === "large") document.documentElement.classList.add("fs-large");
    if (fs === "x-large") document.documentElement.classList.add("fs-x-large");
  } catch {}
  // テキスト間隔 / リンク下線 (issue #390)。各キーは src/scripts/*.ts と一致させること。
  try {
    if (localStorage.getItem("text-spacing") === "true") {
      document.documentElement.classList.add("text-spacing");
    }
    if (localStorage.getItem("underline-links") === "true") {
      document.documentElement.classList.add("underline-links");
    }
  } catch {}
})();
