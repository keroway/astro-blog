/**
 * リンク下線表示設定の単一の真実 (issue #390)
 *
 * html.underline-links を付与すると本文リンクの下線を常時表示し、
 * 色だけに依存しないリンク表現にする。FOUC 防止の初期 class 付与は
 * BaseHead.astro の head inline が担う (このモジュールは import 不可)。
 */

/** localStorage キー。head inline スクリプトと一致させること。 */
export const UNDERLINE_LINKS_KEY = "underline-links";

/** 現在のリンク下線設定。 */
export function getUnderlineLinks(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("underline-links");
}

/** 永続化されたリンク下線設定を html class に再適用する。 */
export function applyUnderlineLinksPreference(): void {
  if (typeof document === "undefined") return;
  let enabled = false;
  if (unsaved !== null) {
    // 保存に失敗した最新の選択値は、古い保存値より優先する
    enabled = unsaved;
  } else {
    try {
      enabled = localStorage.getItem(UNDERLINE_LINKS_KEY) === "true";
    } catch {
      enabled = getUnderlineLinks();
    }
  }
  document.documentElement.classList.toggle("underline-links", enabled);
}

/** 永続化に失敗した最新の選択値 (保存成功・リセット時は null)。 */
let unsaved: boolean | null = null;

/** リンク下線設定を切り替えて永続化する。 */
export function setUnderlineLinks(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("underline-links", enabled);
  try {
    localStorage.setItem(UNDERLINE_LINKS_KEY, enabled ? "true" : "false");
    unsaved = null;
  } catch {
    /* localStorage 不可環境では永続化を諦め、メモリで保持する (動作は継続) */
    unsaved = enabled;
  }
}

/** リンク下線設定を初期状態に戻す。保存キーの削除に失敗してもメモリ上の値は破棄する。 */
export function resetUnderlineLinks(): void {
  if (typeof document === "undefined") return;
  unsaved = null;
  try {
    localStorage.removeItem(UNDERLINE_LINKS_KEY);
  } catch {
    /* 保存キーの削除を諦める */
  }
  document.documentElement.classList.remove("underline-links");
}
