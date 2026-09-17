import { describe, expect, it } from "vitest";
import { stripBom } from "./strip-bom";

describe("stripBom", () => {
  it("先頭の UTF-8 BOM を除去する", () => {
    expect(stripBom("﻿---\ntitle: x\n---\n")).toBe("---\ntitle: x\n---\n");
  });

  it("BOM が無ければ内容をそのまま返す", () => {
    expect(stripBom("---\ntitle: x\n---\n")).toBe("---\ntitle: x\n---\n");
  });

  it("文中の BOM には影響しない", () => {
    expect(stripBom("a﻿b")).toBe("a﻿b");
  });
});
