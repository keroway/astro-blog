/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTextSpacingPreference,
  getTextSpacing,
  resetTextSpacing,
  setTextSpacing,
  TEXT_SPACING_KEY,
} from "./text-spacing";

beforeEach(() => {
  document.documentElement.className = "";
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  // 実 localStorage でリセットし、削除失敗時にメモリへ残した初期値を次のテストへ持ち越さない
  resetTextSpacing();
});

/**
 * happy-dom の Storage は内部でメソッドを Proxy 経由でバインド・キャッシュするため、
 * `vi.spyOn(Storage.prototype, ...)` は最初のアクセス以降効かない。
 * `localStorage` グローバル自体を丸ごと差し替えて例外を再現する。
 */
function stubThrowingLocalStorage(overrides: {
  getItem?: Storage["getItem"];
  setItem?: Storage["setItem"];
  removeItem?: Storage["removeItem"];
}) {
  vi.stubGlobal("localStorage", {
    getItem: overrides.getItem ?? (() => null),
    setItem: overrides.setItem ?? (() => {}),
    removeItem: overrides.removeItem ?? (() => {}),
    clear: () => {},
    key: () => null,
    length: 0,
  });
}

describe("getTextSpacing", () => {
  it("returns false when no class is set", () => {
    expect(getTextSpacing()).toBe(false);
  });

  it("returns true when text-spacing is set", () => {
    document.documentElement.classList.add("text-spacing");
    expect(getTextSpacing()).toBe(true);
  });
});

describe("applyTextSpacingPreference", () => {
  it("defaults to disabled when localStorage is empty", () => {
    applyTextSpacingPreference();
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      false
    );
  });

  it("restores a persisted enabled preference", () => {
    localStorage.setItem(TEXT_SPACING_KEY, "true");
    applyTextSpacingPreference();
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      true
    );
  });

  it("treats any non-'true' stored value as disabled", () => {
    localStorage.setItem(TEXT_SPACING_KEY, "false");
    applyTextSpacingPreference();
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      false
    );
  });

  it("falls back to the current class state when localStorage throws", () => {
    document.documentElement.classList.add("text-spacing");
    stubThrowingLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    applyTextSpacingPreference();
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      true
    );
  });
});

describe("setTextSpacing", () => {
  it("toggles the class and persists the value", () => {
    setTextSpacing(true);
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      true
    );
    expect(localStorage.getItem(TEXT_SPACING_KEY)).toBe("true");

    setTextSpacing(false);
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      false
    );
    expect(localStorage.getItem(TEXT_SPACING_KEY)).toBe("false");
  });

  it("still toggles the class when localStorage.setItem throws", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setTextSpacing(true)).not.toThrow();
    expect(document.documentElement.classList.contains("text-spacing")).toBe(
      true
    );
    resetTextSpacing();
  });

  it("keeps the unsaved choice on re-apply after setItem failed (#991)", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    setTextSpacing(true);
    applyTextSpacingPreference();
    expect(getTextSpacing()).toBe(true);
    resetTextSpacing();
  });

  it("discards the unsaved choice on reset even if removeItem throws", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    setTextSpacing(true);
    resetTextSpacing();
    applyTextSpacingPreference();
    expect(getTextSpacing()).toBe(false);
  });

  it("does not revive the stored value on re-apply when removeItem throws (#996)", () => {
    stubThrowingLocalStorage({
      getItem: () => "true",
      removeItem: () => {
        throw new Error("blocked");
      },
    });
    setTextSpacing(true);
    resetTextSpacing();
    applyTextSpacingPreference();
    expect(getTextSpacing()).toBe(false);
  });
});
