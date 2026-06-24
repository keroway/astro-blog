/**
 * テキスト間隔設定の単一の真実 (issue #390)
 *
 * html.text-spacing を付与すると global.css の読書用トークンが緩み、
 * 行間・字間が広がる。FOUC 防止の初期 class 付与は BaseHead.astro の
 * head inline が担う (このモジュールは import 不可)。
 */

/** localStorage キー。head inline スクリプトと一致させること。 */
export const TEXT_SPACING_KEY = "text-spacing";

/** 現在のテキスト間隔設定。 */
export function getTextSpacing(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("text-spacing");
}

/** 永続化されたテキスト間隔設定を html class に再適用する。 */
export function applyTextSpacingPreference(): void {
  if (typeof document === "undefined") return;
  let enabled = false;
  try {
    enabled = localStorage.getItem(TEXT_SPACING_KEY) === "true";
  } catch {
    enabled = getTextSpacing();
  }
  document.documentElement.classList.toggle("text-spacing", enabled);
}

/** テキスト間隔設定を切り替えて永続化する。 */
export function setTextSpacing(enabled: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("text-spacing", enabled);
  try {
    localStorage.setItem(TEXT_SPACING_KEY, enabled ? "true" : "false");
  } catch {
    /* localStorage 不可環境では永続化を諦める (動作は継続) */
  }
}
