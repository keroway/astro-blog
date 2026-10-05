// E2E 専用のローカル Deploy Hook。/api/trigger-build のサーバー側 fetch の
// 送信先として使い、外部ネットワークと親環境の実フックから隔離する。
// POST → 200、それ以外 → 405。GET /__posts で受けた POST 数を返す。
import { createServer } from "node:http";

const port = Number(process.env.DEPLOY_HOOK_PORT ?? 4336);
let posts = 0;

createServer((req, res) => {
  if (req.method === "GET" && req.url === "/__posts") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ posts }));
    return;
  }
  if (req.method === "POST") {
    posts += 1;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end("{}");
    return;
  }
  res.writeHead(405);
  res.end();
}).listen(port, "127.0.0.1");
