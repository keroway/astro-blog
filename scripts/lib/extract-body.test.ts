import { describe, expect, it } from "vitest";
import { extractBody } from "./extract-body.ts";

const lf = '---\ntitle: Test\ndescription: ""\n---\n\n本文です\n';

describe("extractBody", () => {
  it("LF の frontmatter を除去する", () => {
    expect(extractBody(lf)).toBe("本文です");
  });

  it("CRLF の frontmatter を除去する", () => {
    expect(extractBody(lf.replace(/\n/g, "\r\n"))).toBe("本文です");
  });

  it("BOM 付きでも除去する", () => {
    expect(extractBody(`﻿${lf}`)).toBe("本文です");
  });

  it("本文中の水平線を欠落させない", () => {
    expect(extractBody("---\ntitle: T\n---\n\n前\n\n---\n\n後\n")).toBe(
      "前\n\n---\n\n後"
    );
  });

  it("frontmatter が無ければ本文をそのまま返す", () => {
    expect(extractBody("本文のみ\n")).toBe("本文のみ");
  });
});
