/**
 * モーション低減フラグの単一の真実 (issue #379)
 *
 * 低減は2経路で発火する:
 *   1. OS 設定         … window.matchMedia('(prefers-reduced-motion: reduce)')
 *   2. ユーザー手動設定 … html.reduce-motion class (localStorage 永続化)
 *
 * CSS 側は global.css が同名の条件 (@media + html.reduce-motion) で
 * 同一の低減ルールを適用する。JS から演出可否を判定する箇所は必ず
 * このモジュールの prefersReducedMotion() を経由し、判定ロジックを
 * ここ 1 箇所に集約する (二重定義を避ける)。
 *
 * FOUC 防止のための初期 class 付与は BaseHead.astro の head inline
 * スクリプトが担う (このモジュールは import 不可のため重複は許容)。
 */

/** localStorage キー。head inline スクリプトと一致させること。 */
export const REDUCE_MOTION_KEY = "reduce-motion";

/** OS 設定によるモーション低減希望か。 */
export function osPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** ユーザーが手動でモーション低減を ON にしているか。 */
export function manualReduceMotion(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("reduce-motion");
}

/**
 * モーションを低減すべきか (OS 設定 OR 手動設定)。
 * スクロール演出など JS 側のアニメーション可否はすべてこの関数で判定する。
 */
export function prefersReducedMotion(): boolean {
  return osPrefersReducedMotion() || manualReduceMotion();
}

/**
 * 現在の永続化状態・OS 設定に合わせて html class を再同期する。
 * View Transitions の swap で <html> class が失われるため、ページ遷移後にも呼ぶ。
 */
export function applyMotionPreferences(): void {
  if (typeof document === "undefined") return;

  let manuallyReduced = false;
  try {
    manuallyReduced = localStorage.getItem(REDUCE_MOTION_KEY) === "true";
  } catch {
    /* localStorage 不可環境では class の現在値にフォールバック */
    manuallyReduced = manualReduceMotion();
  }

  document.documentElement.classList.toggle("reduce-motion", manuallyReduced);
  document.documentElement.classList.toggle(
    "kw-anim",
    !osPrefersReducedMotion() && !manuallyReduced
  );
}

/**
 * 手動のモーション低減設定を切り替えて永続化する (issue #378 の a11y メニュー用)。
 * @param state "on"=低減を強制 / "off"=手動設定を解除 (OS 設定には従う)
 */
export function setReduceMotion(state: "on" | "off"): void {
  if (typeof document === "undefined") return;
  const on = state === "on";
  document.documentElement.classList.toggle("reduce-motion", on);
  try {
    localStorage.setItem(REDUCE_MOTION_KEY, on ? "true" : "false");
  } catch {
    /* localStorage 不可環境では永続化を諦める (動作は継続) */
  }
  applyMotionPreferences();
}

/**
 * モーション低減状態の変化を購読する。OS 設定の変更と
 * html.reduce-motion class の付け外しの両方を監視し、
 * 変化時に現在の prefersReducedMotion() を渡す。
 * @returns 購読解除関数
 */
export function watchReducedMotion(
  callback: (reduced: boolean) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  const onMqlChange = () => {
    applyMotionPreferences();
    callback(prefersReducedMotion());
  };
  mql?.addEventListener?.("change", onMqlChange);

  const observer = new MutationObserver(() => callback(prefersReducedMotion()));
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    mql?.removeEventListener?.("change", onMqlChange);
    observer.disconnect();
  };
}
