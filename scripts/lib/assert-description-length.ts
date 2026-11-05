import { MAX_DESCRIPTION_LENGTH } from "../lint-description-length.ts";

/** 生成された description がスキーマ上限を超えていれば例外を投げる。 */
export function assertDescriptionLength(
  description: string,
  label: string
): void {
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(
      `${label} の description が ${MAX_DESCRIPTION_LENGTH} 文字を超えています (${description.length}文字)。記事は更新していません。再実行してください。`
    );
  }
}
