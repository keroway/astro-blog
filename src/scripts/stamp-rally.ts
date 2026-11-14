/**
 * 朱印帳 (StampRally.astro) のクライアント処理。
 *
 * 以前は StampRally.astro のインラインスクリプトだったが、CSP の script-src から
 * 'unsafe-inline' を外すため (#819 / ADR 0021) 通常のバンドル対象にした。モジュールは
 * ページ内で 1 回だけ評価されるので、SiteLayout と colophon の両方が StampRally を
 * 配置しても購読は重複しない。
 */

const STAMP_KEY = "kw-stamp-rally:v1";
const STATIONS = [
  { id: "home", path: "/" },
  { id: "works", path: "/works/" },
  { id: "blog", path: "/blog/" },
  { id: "about", path: "/about/" },
  { id: "now", path: "/now/" },
  { id: "colophon", path: "/colophon/" },
];

// 保存に失敗しても同一ページセッション内で取得状態を失わないよう、メモリにも保持する
const sessionStamps = new Set<string>();
let saveFailed = false;

const readStamps = (): Set<string> => {
  const stamps = new Set(sessionStamps);
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STAMP_KEY) ?? "[]");
    const known = new Set(STATIONS.map((station) => station.id));
    if (Array.isArray(saved)) {
      for (const id of saved) {
        if (known.has(id)) stamps.add(id);
      }
    }
  } catch {}
  return stamps;
};

const writeStamps = (stamps: Set<string>): void => {
  for (const id of stamps) sessionStamps.add(id);
  try {
    localStorage.setItem(STAMP_KEY, JSON.stringify([...stamps]));
    saveFailed = false;
  } catch {
    saveFailed = true;
  }
};

const normalizePath = (path: string): string =>
  path === "/" ? "/" : `${path.replace(/\/$/, "")}/`;

const initStampRally = (): void => {
  const currentPath = normalizePath(window.location.pathname);
  const stamps = readStamps();
  const station = STATIONS.find(
    (item) =>
      currentPath === item.path ||
      (item.path !== "/" && currentPath.startsWith(item.path))
  );
  if (station) {
    stamps.add(station.id);
    writeStamps(stamps);
  }

  for (const el of document.querySelectorAll("[data-stamp-id]")) {
    const id = el.getAttribute("data-stamp-id");
    const collected = Boolean(id && stamps.has(id));
    el.classList.toggle("is-collected", collected);
    const state = el.querySelector("[data-stamp-state]");
    if (state) state.textContent = collected ? "取得済み" : "未取得";
  }

  const complete = document.querySelector<HTMLElement>("[data-stamp-complete]");
  if (complete) {
    complete.hidden = stamps.size < STATIONS.length;
  }

  const unsaved = document.querySelector<HTMLElement>("[data-stamp-unsaved]");
  if (unsaved) unsaved.hidden = !saveFailed;
};

initStampRally();
document.addEventListener("astro:page-load", initStampRally);
