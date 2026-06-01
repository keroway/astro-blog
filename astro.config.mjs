import markdoc from "@astrojs/markdoc";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";
import keystatic from "@keystatic/astro";
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";

const siteUrl = process.env.SITE_URL ?? "https://keroway.com";

const vercelEnv = process.env.VERCEL_ENV;
const isVercelProduction = vercelEnv === "production";
const isVercelPreview = vercelEnv === "preview";

// Vercel Production で Keystatic の env が揃っていないと local モードで動いてしまい、
// Vercel Function の ephemeral filesystem に書き込もうとして admin UI が無音で機能不全になる。
// keystatic.config.ts はブラウザにも bundle されるため process.env を読めない (PUBLIC_ prefix の
// import.meta.env を使う) 一方、astro.config.mjs はサーバー専用なので process.env で十分。
// ビルド時に確実に fail-fast させたいのでこのチェックは astro.config.mjs 側に集約する。
if (
  isVercelProduction &&
  process.env.PUBLIC_KEYSTATIC_STORAGE_KIND !== "github"
) {
  throw new Error(
    "Keystatic: VERCEL_ENV=production では PUBLIC_KEYSTATIC_STORAGE_KIND=github が必須です。" +
      " Vercel の環境変数を docs/cms-flow.md の手順に従って設定してください。"
  );
}

// Preview デプロイは記事プレビュー専用に割り切り、Keystatic 統合を mount しない。
// 理由: Preview の Vercel Function も ephemeral filesystem で、local モードで起動すると
// "保存できた" と誤認させてデータロストする (production と同じ fail-open 経路)。
// production → 常に有効 (github mode 強制)
// preview → 無効 (/keystatic は 404)
// local dev (VERCEL_ENV 未定義) → 有効 (local mode で従来通り動作)
// markdoc は Keystatic content フィールド (.mdoc) の描画に必須。書き込みを伴わないため
// Preview でも有効でよい (mount を絞るのは keystatic 統合のみ)。設定は markdoc.config.mjs。
const baseIntegrations = [UnoCSS(), mdx(), markdoc(), sitemap()];
const integrations = isVercelPreview
  ? baseIntegrations
  : [...baseIntegrations, react(), keystatic()];

// Keystatic 管理 UI は本番でも /keystatic から開けるようにする。
// admin / API ルートだけが on-demand (Vercel Function) になり、
// ブログや Works などのコンテンツページは引き続き SSG として配信される。
// 詳細は docs/adr/0005-keystatic-admin-runtime.md を参照。
export default defineConfig({
  site: siteUrl,
  output: "static",
  adapter: vercel(),
  integrations,
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
    },
  },
  redirects: {
    "/blog/0.96%E3%82%A4%E3%83%B3%E3%83%81%E6%9C%89%E6%A9%9FEL%E3%83%87%E3%82%A3%E3%82%B9%E3%83%97%E3%83%AC%E3%82%A4(SSD1306)/":
      {
        status: 308,
        destination: "/blog/oled-display-ssd1306/",
      },
    "/blog/Apache%20Solr%20(1)/": {
      status: 308,
      destination: "/blog/apache-solr-1/",
    },
    "/blog/Arduino_rgb_led/": {
      status: 308,
      destination: "/blog/arduino-rgb-led/",
    },
    "/blog/BeautifulSoup4(1)/": {
      status: 308,
      destination: "/blog/beautifulsoup4-1/",
    },
    "/blog/BeautifulSoup4(2)/": {
      status: 308,
      destination: "/blog/beautifulsoup4-2/",
    },
    "/blog/cloud9%20(php)/": {
      status: 308,
      destination: "/blog/cloud9-php/",
    },
    "/blog/code.org/": {
      status: 308,
      destination: "/blog/code-org/",
    },
    "/blog/Dwitter/": {
      status: 308,
      destination: "/blog/dwitter/",
    },
    "/blog/Elixir/": {
      status: 308,
      destination: "/blog/elixir/",
    },
    "/blog/ESP-WROOM02%20DIP%E5%8C%96%E3%82%AD%E3%83%83%E3%83%88(%E5%8D%8A%E7%94%B0%E4%BB%98%E3%81%91)/":
      {
        status: 308,
        destination: "/blog/esp-wroom02-dip-kit-soldering/",
      },
    "/blog/GAE%20sendmail%20test/": {
      status: 308,
      destination: "/blog/gae-sendmail-test/",
    },
    "/blog/Getting%20started%20with%20Python%20Web%20Scraping/": {
      status: 308,
      destination: "/blog/getting-started-with-python-web-scraping/",
    },
    "/blog/GoogleCloudSourceRepositories/": {
      status: 308,
      destination: "/blog/google-cloud-source-repositories/",
    },
    "/blog/HackMd.io/": {
      status: 308,
      destination: "/blog/hackmd-io/",
    },
    "/blog/Kotlin/": {
      status: 308,
      destination: "/blog/kotlin/",
    },
    "/blog/Mac%20OS%20(High%20Sierra)%20%E3%81%A7%20X11%E3%83%95%E3%82%A9%E3%83%AF%E3%83%BC%E3%83%87%E3%82%A3%E3%83%B3%E3%82%B0/":
      {
        status: 308,
        destination: "/blog/macos-high-sierra-x11-forwarding/",
      },
    "/blog/Maker%20Faire%20Tokyo/": {
      status: 308,
      destination: "/blog/maker-faire-tokyo/",
    },
    "/blog/Maker%20Faire%20Tokyo%202018(8_4-8_5)/": {
      status: 308,
      destination: "/blog/maker-faire-tokyo-2018/",
    },
    "/blog/Mastodon%20on%20Docker(2)/": {
      status: 308,
      destination: "/blog/mastodon-on-docker-2/",
    },
    "/blog/Mastodon%20on%20Docker/": {
      status: 308,
      destination: "/blog/mastodon-on-docker/",
    },
    "/blog/Mozilla%20SSL%20Configuration%20Generator/": {
      status: 308,
      destination: "/blog/mozilla-ssl-configuration-generator/",
    },
    "/blog/nerodia(1)/": {
      status: 308,
      destination: "/blog/nerodia-1/",
    },
    "/blog/nerodia(2)/": {
      status: 308,
      destination: "/blog/nerodia-2/",
    },
    "/blog/nerodia(3)/": {
      status: 308,
      destination: "/blog/nerodia-3/",
    },
    "/blog/PICO(Arduino%E4%BA%92%E6%8F%9B%E3%83%9C%E3%83%BC%E3%83%89)/": {
      status: 308,
      destination: "/blog/pico-arduino-compatible-board/",
    },
    "/blog/Raspberry%20Pi(Event)/": {
      status: 308,
      destination: "/blog/raspberry-pi-event/",
    },
    "/blog/Raspberry%20Pi(Event%E5%8F%82%E5%8A%A0)/": {
      status: 308,
      destination: "/blog/raspberry-pi-event-attend/",
    },
    "/blog/RaspberryPi3%20%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97(2)/":
      {
        status: 308,
        destination: "/blog/raspberrypi3-setup-2/",
      },
    "/blog/RaspberryPi3%20%E3%82%BB%E3%83%83%E3%83%88%E3%82%A2%E3%83%83%E3%83%97/":
      {
        status: 308,
        destination: "/blog/raspberrypi3-setup/",
      },
    "/blog/repl.it/": {
      status: 308,
      destination: "/blog/repl-it/",
    },
    "/blog/rust(%E4%BA%88%E5%91%8A)/": {
      status: 308,
      destination: "/blog/rust-preview/",
    },
    "/blog/rust%20on%20Codeanywhere/": {
      status: 308,
      destination: "/blog/rust-on-codeanywhere/",
    },
    "/blog/scratch3.0/": {
      status: 308,
      destination: "/blog/scratch3-0/",
    },
    "/blog/StackEdit/": {
      status: 308,
      destination: "/blog/stackedit/",
    },
    "/blog/unity_sample/": {
      status: 308,
      destination: "/blog/unity-sample/",
    },
    "/blog/Unity%20chan/": {
      status: 308,
      destination: "/blog/unity-chan/",
    },
    "/blog/Xamarin(2)/": {
      status: 308,
      destination: "/blog/xamarin-2/",
    },
    "/blog/Xamarin/": {
      status: 308,
      destination: "/blog/xamarin/",
    },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91100%E4%BA%BA%E3%81%AE%E3%83%97%E3%83%AD%E3%81%8C%E9%81%B8%E3%82%93%E3%81%A0%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E9%96%8B%E7%99%BA%E3%81%AE%E5%90%8D%E8%91%97/":
      {
        status: 308,
        destination: "/blog/book-software-dev-masterpieces/",
      },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91Expert%20Angular/": {
      status: 308,
      destination: "/blog/book-expert-angular/",
    },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91%E3%82%BD%E3%83%95%E3%83%88%E3%82%A6%E3%82%A7%E3%82%A2%E3%83%BB%E3%82%B0%E3%83%AD%E3%83%BC%E3%83%90%E3%83%AA%E3%82%BC%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E5%85%A5%E9%96%80/":
      {
        status: 308,
        destination: "/blog/book-software-globalization/",
      },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9E%E3%81%AE%E6%95%B0%E5%AD%A6(%E7%AC%AC2%E7%89%88)/":
      {
        status: 308,
        destination: "/blog/book-programmers-math-2nd-edition/",
      },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9E%E3%83%BC%E3%81%A8%E3%81%8A%E4%BB%95%E4%BA%8B%E3%82%92%E3%81%99%E3%82%8B%E3%81%A8%E3%81%84%E3%81%86%E3%81%93%E3%81%A8/":
      {
        status: 308,
        destination: "/blog/book-working-with-programmers/",
      },
    "/blog/%E3%80%90%E8%AA%AD%E6%9B%B8%E3%80%91%E6%96%B0%E8%A3%85%E7%89%88%20%E9%81%94%E4%BA%BA%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9E%E3%83%BC/":
      {
        status: 308,
        destination: "/blog/book-pragmatic-programmer/",
      },
    "/blog/%E3%83%AC%E3%83%BC%E3%82%B6%E3%83%BC%E6%B8%AC%E8%B7%9D%E3%83%A2%E3%82%B8%E3%83%A5%E3%83%BC%E3%83%AB(VL53L0X)/":
      {
        status: 308,
        destination: "/blog/laser-distance-module-vl53l0x/",
      },
    "/blog/%E6%8A%80%E8%A1%93%E7%B3%BB%E9%9B%BB%E5%AD%90%E6%9B%B8%E7%B1%8D%EF%BC%88%E5%9B%BD%E5%86%85%EF%BC%89/":
      {
        status: 308,
        destination: "/blog/tech-ebooks-domestic/",
      },
    "/blog/%E8%B2%B7%E3%81%84%E7%89%A9%E3%81%A8%E5%8D%8A%E7%94%B0%E4%BB%98%E3%81%91/":
      {
        status: 308,
        destination: "/blog/shopping-and-soldering/",
      },
    "/blog/%E9%9B%BB%E5%AD%90%E6%9B%B8%E7%B1%8D/": {
      status: 308,
      destination: "/blog/ebooks/",
    },
  },
});
