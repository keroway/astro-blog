import { parse, stringify } from "yaml";

export const normalizeDates = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeDates);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, childValue]) => [
        key,
        normalizeDates(childValue),
      ])
    );
  }

  return value;
};

const OPENING = /^---\r?\n/;
const CLOSING = /(^|\r?\n)---[ \t]*(?:\r?\n|$)/;

/** frontmatter と本文を分離する。LF / CRLF / BOM 付きの入力を扱う。 */
export const splitFrontmatter = (text: string) => {
  const normalized = text.replace(/^﻿/, "");
  const opening = OPENING.exec(normalized);

  if (!opening) {
    return { frontmatter: {}, body: normalized };
  }

  const rest = normalized.slice(opening[0].length);
  const closing = CLOSING.exec(rest);

  if (!closing) {
    return { frontmatter: {}, body: normalized };
  }

  return {
    frontmatter: normalizeDates(
      parse(rest.slice(0, closing.index)) ?? {}
    ) as Record<string, unknown>,
    body: rest.slice(closing.index + closing[0].length),
  };
};

export const mdocFromFile = (text: string) => {
  const { frontmatter, body } = splitFrontmatter(text);

  return { ...frontmatter, body };
};

export const mdocToFile = (data: unknown) => {
  const { body = "", ...frontmatter } = normalizeDates(data ?? {}) as Record<
    string,
    unknown
  >;
  const yaml = stringify(frontmatter, {
    lineWidth: 100,
    sortMapEntries: false,
  }).trim();

  return `---\n${yaml}\n---\n\n${body}`;
};
