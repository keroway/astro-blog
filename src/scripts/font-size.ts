/**
 * 文字サイズ設定の単一の真実 (issue #378)
 *
 * html.fs-large を付与すると tokens.css の --kw-fs-scale が 1.125 になり、
 * 全フォントサイズトークンが比例拡大する。FOUC 防止の初期 class 付与は
 * BaseHead.astro の head inline が担う (このモジュールは import 不可)。
 */

/** localStorage キー。head inline スクリプトと一致させること。 */
export const FONT_SIZE_KEY = "font-size";

export type FontSize = "normal" | "large";

/** 現在の文字サイズ設定。 */
export function getFontSize(): FontSize {
  if (typeof document === "undefined") return "normal";
  return document.documentElement.classList.contains("fs-large")
    ? "large"
    : "normal";
}

/** 文字サイズを切り替えて永続化する。 */
export function setFontSize(size: FontSize): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("fs-large", size === "large");
  try {
    localStorage.setItem(FONT_SIZE_KEY, size);
  } catch {
    /* localStorage 不可環境では永続化を諦める (動作は継続) */
  }
}
