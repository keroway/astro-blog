/**
 * 読了進捗バー (ReadingProgress.astro) の駆動ロジック (issue #844)
 *
 * モーション低減の ON/OFF は同一ページ内でも切り替わる (A11yMenu / OS 設定)。
 * 初期化時の判定だけでは切り替えに追従できないため、watchReducedMotion を購読し、
 * 変化のたびに属性・inline offset・scroll/resize 購読を再同期する。
 */
import { prefersReducedMotion, watchReducedMotion } from "./reduce-motion";

// Scroll-Driven Animations (issue #499)。名前付き view-timeline 対応ブラウザは
// CSS (ReadingProgress.astro の @supports ブロック) だけで stroke-dashoffset を駆動し、
// JS は scroll ハンドラを登録しない。CSS 側と同じ機能 (animation-timeline) を検出する。
const supportsScrollTimeline = () => {
  try {
    return (
      typeof CSS !== "undefined" &&
      !!CSS.supports &&
      CSS.supports("animation-timeline: --x")
    );
  } catch {
    return false;
  }
};

/**
 * 進捗バーを初期化し、解除関数を返す。対象要素が無いページでは何もしない。
 * ページ遷移時は前回の解除関数を呼んでから再度呼ぶこと。
 */
export function mountReadingProgress(): () => void {
  const root = document.querySelector<HTMLElement>(".reading-progress");
  const fill = document.querySelector<SVGPathElement>(
    ".reading-progress__fill"
  );
  const article = document.querySelector<HTMLElement>(".post");
  if (!root || !fill || !article) return () => {};

  let stopScroll = () => {};

  const startScroll = () => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const rect = article.getBoundingClientRect();
      const scrollable = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / scrollable));
      fill.style.strokeDashoffset = String(100 - progress * 100);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    stopScroll = () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      stopScroll = () => {};
    };
  };

  const sync = (reduced: boolean) => {
    stopScroll();

    if (reduced) {
      root.dataset.reducedMotion = "true";
      delete root.dataset.cssTimeline;
      fill.style.strokeDashoffset = "0";
      return;
    }

    root.dataset.reducedMotion = "false";

    // CSS 側が駆動できるブラウザでは fill の値を CSS に委ね、inline offset を外す。
    if (supportsScrollTimeline()) {
      root.dataset.cssTimeline = "true";
      fill.style.removeProperty("stroke-dashoffset");
      return;
    }

    delete root.dataset.cssTimeline;
    startScroll();
  };

  sync(prefersReducedMotion());
  const unwatch = watchReducedMotion(sync);

  return () => {
    unwatch();
    stopScroll();
  };
}
