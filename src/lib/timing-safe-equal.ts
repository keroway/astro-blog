import { timingSafeEqual } from "node:crypto";

/**
 * タイミング攻撃対策の文字列比較。長さが異なる場合も早期終了せず、
 * ダミー比較を挟んでから false を返すことで比較時間の差を均す。
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
