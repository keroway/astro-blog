/**
 * 文字サイズ設定の単一の真実 (issue #378)
 *
 * html.fs-large / html.fs-x-large を付与すると tokens.css の --kw-fs-scale が
 * 1.125 / 1.25 になり、全フォントサイズトークンが比例拡大する。
 * FOUC 防止の初期 class 付与は
 * BaseHead.astro の head inline が担う (このモジュールは import 不可)。
 */

/** localStorage キー。head inline スクリプトと一致させること。 */
export const FONT_SIZE_KEY = "font-size";

export type FontSize = "normal" | "large" | "x-large";

/** 現在の文字サイズ設定。 */
export function getFontSize(): FontSize {
  if (typeof document === "undefined") return "normal";
  if (document.documentElement.classList.contains("fs-x-large"))
    return "x-large";
  return document.documentElement.classList.contains("fs-large")
    ? "large"
    : "normal";
}

/** 永続化された文字サイズ設定を html class に再適用する。 */
export function applyFontSizePreference(): void {
  if (typeof document === "undefined") return;
  let size: FontSize = "normal";
  if (unsavedSize !== null) {
    // 保存に失敗した最新の選択値は、古い保存値より優先する
    size = unsavedSize;
  } else {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      size = stored === "large" || stored === "x-large" ? stored : "normal";
    } catch {
      size = getFontSize();
    }
  }
  applySize(size);
}

/** 永続化に失敗した最新の選択値 (保存成功・リセット時は null)。 */
let unsavedSize: FontSize | null = null;

function applySize(size: FontSize): void {
  document.documentElement.classList.toggle("fs-large", size === "large");
  document.documentElement.classList.toggle("fs-x-large", size === "x-large");
}

/** 文字サイズを切り替えて永続化する。 */
export function setFontSize(size: FontSize): void {
  if (typeof document === "undefined") return;
  applySize(size);
  try {
    localStorage.setItem(FONT_SIZE_KEY, size);
    unsavedSize = null;
  } catch {
    /* localStorage 不可環境では永続化を諦め、メモリで保持する (動作は継続) */
    unsavedSize = size;
  }
}

/** 文字サイズを初期状態に戻す。保存キーの削除に失敗してもメモリ上の値は破棄する。 */
export function resetFontSize(): void {
  if (typeof document === "undefined") return;
  unsavedSize = null;
  try {
    localStorage.removeItem(FONT_SIZE_KEY);
  } catch {
    /* 削除できない古い保存値が再適用で復活しないよう、初期値をメモリで保持する */
    unsavedSize = "normal";
  }
  applySize("normal");
}
