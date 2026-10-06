/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReadingProgress } from "./reading-progress";

const root = () => document.querySelector<HTMLElement>(".reading-progress")!;
const fill = () =>
  document.querySelector<SVGPathElement>(".reading-progress__fill")!;

/** 記事高さ 2000 / viewport 1000 で、上端が articleTop の位置にある状態にする。 */
let articleTop = 0;
const setArticleTop = (top: number) => {
  articleTop = top;
};

function setup({ cssTimeline }: { cssTimeline: boolean }) {
  articleTop = 0;
  document.documentElement.className = "";
  document.body.innerHTML = `
    <div class="reading-progress"><svg><path class="reading-progress__fill"></path></svg></div>
    <article class="post"></article>`;
  document.querySelector(".post")!.getBoundingClientRect = () =>
    ({ top: articleTop, height: 2000 }) as DOMRect;

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  vi.stubGlobal("CSS", { supports: () => cssTimeline });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("innerHeight", 1000);
}

/** MutationObserver (microtask) の発火を待つ。 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function toggleManualReduce(on: boolean) {
  document.documentElement.classList.toggle("reduce-motion", on);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("mountReadingProgress (JS fallback)", () => {
  beforeEach(() => setup({ cssTimeline: false }));

  it("低減 ON で初期化すると完了表示になりスクロールに反応しない", () => {
    toggleManualReduce(true);
    setArticleTop(-500);
    const unmount = mountReadingProgress();

    expect(root().dataset.reducedMotion).toBe("true");
    expect(fill().style.strokeDashoffset).toBe("0");

    setArticleTop(-1000);
    window.dispatchEvent(new Event("scroll"));
    expect(fill().style.strokeDashoffset).toBe("0");
    unmount();
  });

  it("初期 ON → OFF でスクロール購読が再開し進捗を再計算する", async () => {
    toggleManualReduce(true);
    setArticleTop(-500);
    const unmount = mountReadingProgress();

    toggleManualReduce(false);
    await flush();

    expect(root().dataset.reducedMotion).toBe("false");
    expect(fill().style.strokeDashoffset).toBe("50");

    setArticleTop(-1000);
    window.dispatchEvent(new Event("scroll"));
    expect(fill().style.strokeDashoffset).toBe("0");
    unmount();
  });

  it("初期 OFF → ON でスクロール購読を止め完了表示にする", async () => {
    setArticleTop(-500);
    const unmount = mountReadingProgress();
    expect(fill().style.strokeDashoffset).toBe("50");

    toggleManualReduce(true);
    await flush();

    expect(root().dataset.reducedMotion).toBe("true");
    expect(fill().style.strokeDashoffset).toBe("0");

    setArticleTop(-250);
    window.dispatchEvent(new Event("scroll"));
    expect(fill().style.strokeDashoffset).toBe("0");
    unmount();
  });

  it("解除後は設定変更にもスクロールにも反応しない", async () => {
    const unmount = mountReadingProgress();
    unmount();

    setArticleTop(-500);
    window.dispatchEvent(new Event("scroll"));
    toggleManualReduce(true);
    await flush();

    expect(fill().style.strokeDashoffset).toBe("100");
    expect(root().dataset.reducedMotion).toBe("false");
  });

  it("対象要素が無いページでは何もしない", () => {
    document.body.innerHTML = "";
    expect(() => mountReadingProgress()()).not.toThrow();
  });
});

describe("mountReadingProgress (CSS timeline)", () => {
  beforeEach(() => setup({ cssTimeline: true }));

  it("低減 ON → OFF で inline offset を外し CSS 駆動へ戻す", async () => {
    toggleManualReduce(true);
    const unmount = mountReadingProgress();
    expect(fill().style.strokeDashoffset).toBe("0");
    expect(root().dataset.cssTimeline).toBeUndefined();

    toggleManualReduce(false);
    await flush();

    expect(root().dataset.reducedMotion).toBe("false");
    expect(root().dataset.cssTimeline).toBe("true");
    expect(fill().style.strokeDashoffset).toBe("");
    unmount();
  });
});
