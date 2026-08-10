/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyFontSizePreference,
  FONT_SIZE_KEY,
  getFontSize,
  setFontSize,
} from "./font-size";

beforeEach(() => {
  document.documentElement.className = "";
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

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

describe("getFontSize", () => {
  it("returns normal when no class is set", () => {
    expect(getFontSize()).toBe("normal");
  });

  it("returns large when fs-large is set", () => {
    document.documentElement.classList.add("fs-large");
    expect(getFontSize()).toBe("large");
  });

  it("returns x-large when fs-x-large is set, even alongside fs-large", () => {
    document.documentElement.classList.add("fs-large", "fs-x-large");
    expect(getFontSize()).toBe("x-large");
  });
});

describe("applyFontSizePreference", () => {
  it("defaults to normal (no class) when localStorage is empty", () => {
    applyFontSizePreference();
    expect(document.documentElement.classList.contains("fs-large")).toBe(false);
    expect(document.documentElement.classList.contains("fs-x-large")).toBe(
      false
    );
  });

  it("restores a persisted large preference", () => {
    localStorage.setItem(FONT_SIZE_KEY, "large");
    applyFontSizePreference();
    expect(document.documentElement.classList.contains("fs-large")).toBe(true);
    expect(document.documentElement.classList.contains("fs-x-large")).toBe(
      false
    );
  });

  it("restores a persisted x-large preference", () => {
    localStorage.setItem(FONT_SIZE_KEY, "x-large");
    applyFontSizePreference();
    expect(document.documentElement.classList.contains("fs-x-large")).toBe(
      true
    );
  });

  it("falls back to normal for an unknown stored value", () => {
    localStorage.setItem(FONT_SIZE_KEY, "huge");
    applyFontSizePreference();
    expect(document.documentElement.classList.contains("fs-large")).toBe(false);
    expect(document.documentElement.classList.contains("fs-x-large")).toBe(
      false
    );
  });

  it("falls back to the current class state when localStorage throws", () => {
    document.documentElement.classList.add("fs-large");
    stubThrowingLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    applyFontSizePreference();
    expect(document.documentElement.classList.contains("fs-large")).toBe(true);
  });
});

describe("setFontSize", () => {
  it("toggles the class and persists the value", () => {
    setFontSize("large");
    expect(document.documentElement.classList.contains("fs-large")).toBe(true);
    expect(localStorage.getItem(FONT_SIZE_KEY)).toBe("large");
  });

  it("switches from x-large back to normal, clearing both classes", () => {
    setFontSize("x-large");
    setFontSize("normal");
    expect(document.documentElement.classList.contains("fs-large")).toBe(false);
    expect(document.documentElement.classList.contains("fs-x-large")).toBe(
      false
    );
    expect(localStorage.getItem(FONT_SIZE_KEY)).toBe("normal");
  });

  it("still toggles the class when localStorage.setItem throws", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setFontSize("large")).not.toThrow();
    expect(document.documentElement.classList.contains("fs-large")).toBe(true);
  });
});
