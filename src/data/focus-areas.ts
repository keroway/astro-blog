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
      "回路やセンサー、マイコンを扱うソフトウェアの開発に長く関わってきました。機器の制御から、ネットワークを通じたデータのやり取りまで扱っています。",
    visualKey: "embedded_iot",
  },
  web_frontend: {
    key: "web_frontend",
    title: "Web フロントエンド",
    description:
      "読み込みの速さとアクセシビリティを意識して、画面を作っています。型を使って実装の間違いに気づきやすくすることにも関心があります。",
    visualKey: "web_frontend",
  },
  mobile_app: {
    key: "mobile_app",
    title: "モバイルアプリ",
    description:
      "共通のコードで iOS と Android 向けに開発するほか、ネイティブ実装との接続や、近接無線を使う機器との連携にも取り組んできました。",
    visualKey: "mobile_app",
  },
  cloud_devops: {
    key: "cloud_devops",
    title: "クラウド & DevOps",
    description:
      "クラウドやオンプレミスでの構築、運用、それらをつなぐネットワークを担当してきました。公開後も安定して動かせるよう、監視や自動化を含めて整えています。",
    visualKey: "cloud_devops",
  },
  ai_engineering: {
    key: "ai_engineering",
    title: "AI 活用開発",
    description:
      "LLM やエージェントを自作のサービスに組み込んでいます。これまでの開発経験を使いながら、どこに役立つか、どこに注意が必要かを試しています。",
    visualKey: "ai_engineering",
  },
};

export function getFocusAreas(keys: readonly FocusAreaKey[]): FocusArea[] {
  return keys.map((k) => focusAreaMap[k]);
}

export function getAllFocusAreas(): FocusArea[] {
  return Object.values(focusAreaMap);
}
