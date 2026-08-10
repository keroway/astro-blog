/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTextSpacingPreference,
  getTextSpacing,
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
  });
});
