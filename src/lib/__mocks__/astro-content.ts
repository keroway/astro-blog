// vitest 用の astro:content スタブ
// 純関数テストでは getCollection は呼ばれないため空実装で十分。
export async function getCollection() {
  return [];
}
