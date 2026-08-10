/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyUnderlineLinksPreference,
  getUnderlineLinks,
  setUnderlineLinks,
  UNDERLINE_LINKS_KEY,
} from "./underline-links";

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

describe("getUnderlineLinks", () => {
  it("returns false when no class is set", () => {
    expect(getUnderlineLinks()).toBe(false);
  });

  it("returns true when underline-links is set", () => {
    document.documentElement.classList.add("underline-links");
    expect(getUnderlineLinks()).toBe(true);
  });
});

describe("applyUnderlineLinksPreference", () => {
  it("defaults to disabled when localStorage is empty", () => {
    applyUnderlineLinksPreference();
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      false
    );
  });

  it("restores a persisted enabled preference", () => {
    localStorage.setItem(UNDERLINE_LINKS_KEY, "true");
    applyUnderlineLinksPreference();
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      true
    );
  });

  it("treats any non-'true' stored value as disabled", () => {
    localStorage.setItem(UNDERLINE_LINKS_KEY, "nope");
    applyUnderlineLinksPreference();
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      false
    );
  });

  it("falls back to the current class state when localStorage throws", () => {
    document.documentElement.classList.add("underline-links");
    stubThrowingLocalStorage({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    applyUnderlineLinksPreference();
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      true
    );
  });
});

describe("setUnderlineLinks", () => {
  it("toggles the class and persists the value", () => {
    setUnderlineLinks(true);
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      true
    );
    expect(localStorage.getItem(UNDERLINE_LINKS_KEY)).toBe("true");

    setUnderlineLinks(false);
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      false
    );
    expect(localStorage.getItem(UNDERLINE_LINKS_KEY)).toBe("false");
  });

  it("still toggles the class when localStorage.setItem throws", () => {
    stubThrowingLocalStorage({
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(() => setUnderlineLinks(true)).not.toThrow();
    expect(document.documentElement.classList.contains("underline-links")).toBe(
      true
    );
  });
});
