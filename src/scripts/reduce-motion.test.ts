/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyMotionPreferences,
  manualReduceMotion,
  osPrefersReducedMotion,
  prefersReducedMotion,
  REDUCE_MOTION_KEY,
  setReduceMotion,
  watchReducedMotion,
} from "./reduce-motion";

/**
 * happy-dom の Storage は内部でメソッドを Proxy 経由でバインド・キャッシュするため、
 * `vi.spyOn(Storage.prototype, ...)` は最初のアクセス以降効かない。
 * `localStorage` グローバル自体を丸ごと差し替えて例外を再現する。
 */
function stubThrowingLocalStorage(overrides: {
  getItem?: Storage["getItem"];
  setItem?: Storage["setItem"];
}) {
  vi.stubGlobal("localStorage", {
    getItem: overrides.getItem ?? (() => null),
    setItem: overrides.setItem ?? (() => {}),
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    length: 0,
  });
}

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

beforeEach(() => {
  document.documentElement.className = "";
  localStorage.clear();
  mockMatchMedia(false);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("manualReduceMotion", () => {
  it("is false when no class is set", () => {
    expect(manualReduceMotion()).toBe(false);
  });

  it("is true when reduce-motion class is set", () => {
    document.documentElement.classList.add("reduce-motion");
    expect(manualReduceMotion()).toBe(true);
  });
});

describe("osPrefersReducedMotion", () => {
  it("reflects the matchMedia result", () => {
    mockMatchMedia(true);
    expect(osPrefersReducedMotion()).toBe(true);

    mockMatchMedia(false);
    expect(osPrefersReducedMotion()).toBe(false);
  });
});

describe("prefersReducedMotion", () => {
  it("is true when only OS prefers reduced motion", () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it("is true when only the manual setting is on", () => {
    document.documentElement.classList.add("reduce-motion");
    expect(prefersReducedMotion()).toBe(true);
  });

  it("is false when neither is set", () => {
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe("applyMotionPreferences", () => {
  it("clears reduce-motion and enables kw-anim when nothing is persisted and OS allows motion", () => {
    applyMotionPreferences();
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      false
    );
    expect(document.documentElement.classList.contains("kw-anim")).toBe(true);
  });

  it("restores a persisted manual preference and disables kw-anim", () => {
    localStorage.setItem(REDUCE_MOTION_KEY, "true");
    applyMotionPreferences();
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      true
    );
    expect(document.documentElement.classList.contains("kw-anim")).toBe(false);
  });

  it("disables kw-anim when the OS prefers reduced motion, even without a manual override", () => {
    mockMatchMedia(true);
    applyMotionPreferences();
    expect(document.documentElement.classList.contains("kw-anim")).toBe(false);
  });

  it("falls back to the current class state when localStorage throws", () => {
    document.documentElement.classList.add("reduce-motion");
    stubThrowingLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    applyMotionPreferences();
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      true
    );
  });
});

describe("setReduceMotion", () => {
  it("turns reduced motion on and persists it", () => {
    setReduceMotion("on");
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      true
    );
    expect(localStorage.getItem(REDUCE_MOTION_KEY)).toBe("true");
    expect(document.documentElement.classList.contains("kw-anim")).toBe(false);
  });

  it("turns reduced motion off and persists it", () => {
    setReduceMotion("on");
    setReduceMotion("off");
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      false
    );
    expect(localStorage.getItem(REDUCE_MOTION_KEY)).toBe("false");
  });

  it("does not throw when localStorage.setItem fails, and resyncs from the (unwritten) persisted state afterward", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setReduceMotion("on")).not.toThrow();
    // setItem 失敗で実際には永続化されないため、setReduceMotion 末尾の
    // applyMotionPreferences() による再同期で「未設定」扱いに戻る
    // (OS 設定も reduce を求めていないため reduce-motion は外れる)。
    expect(document.documentElement.classList.contains("reduce-motion")).toBe(
      false
    );
  });
});

describe("watchReducedMotion", () => {
  it("notifies the callback when the reduce-motion class changes", async () => {
    const callback = vi.fn();
    const unsubscribe = watchReducedMotion(callback);

    setReduceMotion("on");
    // MutationObserver callbacks fire as a microtask; flush the queue.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(callback).toHaveBeenCalledWith(true);

    unsubscribe();
  });

  it("returns a no-op unsubscribe function that does not throw", () => {
    const unsubscribe = watchReducedMotion(vi.fn());
    expect(() => unsubscribe()).not.toThrow();
  });
});
