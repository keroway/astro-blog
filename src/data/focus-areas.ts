export type FocusAreaKey =
  | "embedded_iot"
  | "web_frontend"
  | "mobile_app"
  | "cloud_devops"
  | "ai_engineering";

export type FocusArea = {
  key: FocusAreaKey;
  title: string;
  description: string;
  visualKey: string;
};

const focusAreaMap: Record<FocusAreaKey, FocusArea> = {
  embedded_iot: {
    key: "embedded_iot",
    title: "組み込み・IoT",
    description:
      "物理に触れる回路と、ネットワークの向こうにあるデータ。両者をつなぐ細い導線を設計し、書く仕事に長く関わってきました。",
    visualKey: "embedded_iot",
  },
  web_frontend: {
    key: "web_frontend",
    title: "Web フロントエンド",
    description:
      "読み込みの速さ、支援技術での到達しやすさ、コードの型安全性。三方を同時に下げない設計に関心があります。",
    visualKey: "web_frontend",
  },
  mobile_app: {
    key: "mobile_app",
    title: "モバイルアプリ",
    description:
      "単一コードベースから iOS / Android の両側に届けるクロスプラットフォーム開発。ネイティブ実装とのブリッジや、近接無線デバイスとの連携も含めて手を動かしてきました。",
    visualKey: "mobile_app",
  },
  cloud_devops: {
    key: "cloud_devops",
    title: "クラウド & DevOps",
    description:
      "本番に届けたコードを、夜の間も静かに走らせ続ける仕組み。クラウド、オンプレ、その境界を渡る経路まで、長く担当してきた裏方の領域です。",
    visualKey: "cloud_devops",
  },
  ai_engineering: {
    key: "ai_engineering",
    title: "AI 活用開発",
    description:
      "LLM やエージェントを、道具として自分のプロダクトに組み込む領域。長く積んだ設計の勘所を、新しい抽象の上で試しています。",
    visualKey: "ai_engineering",
  },
};

export function getFocusAreas(keys: readonly FocusAreaKey[]): FocusArea[] {
  return keys.map((k) => focusAreaMap[k]);
}

export function getAllFocusAreas(): FocusArea[] {
  return Object.values(focusAreaMap);
}
