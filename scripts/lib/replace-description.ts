// 二重引用符・単引用符どちらで書かれた description 行も対象にする。
// YAML の行末コメント（` # todo`）が付いていても書き換える。
const DESCRIPTION_LINE = /^description:[ \t]*(?:".*"|'.*')[ \t]*(?:#.*)?$/m;

export function replaceDescription(
  content: string,
  description: string
): string {
  if (!DESCRIPTION_LINE.test(content)) {
    throw new Error("description 行が見つからず書き換えできませんでした");
  }
  return content.replace(
    DESCRIPTION_LINE,
    () => `description: ${JSON.stringify(description)}`
  );
}
