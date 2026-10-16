import type { APIRoute } from "astro";
import { timingSafeEqualString } from "../../lib/timing-safe-equal";

export const prerender = false;

const DEPLOY_HOOK_TIMEOUT_MS = 10_000;

export const GET: APIRoute = async ({ request }) => {
  const cronSecret = import.meta.env.CRON_SECRET;

  if (!cronSecret) {
    if (import.meta.env.PROD) {
      // 本番で CRON_SECRET が設定されていない = 設定ミス。fail-fast する。
      return new Response("CRON_SECRET is not configured", { status: 500 });
    }
    // ローカル dev は認証をスキップ（.env.example 参照）
  } else {
    const authHeader = request.headers.get("authorization") ?? "";
    if (!timingSafeEqualString(authHeader, `Bearer ${cronSecret}`)) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const deployHookUrl = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    return new Response("VERCEL_DEPLOY_HOOK_URL is not configured", {
      status: 500,
    });
  }

  // 応答しない接続で関数実行が上限まで居座らないよう、待機に期限を設ける。
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEPLOY_HOOK_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(deployHookUrl, {
      method: "POST",
      signal: controller.signal,
    });
  } catch {
    // 例外オブジェクトには接続先 URL が含まれうるため、詳細は応答に出さない。
    if (controller.signal.aborted) {
      return new Response("Deploy hook timed out", { status: 504 });
    }
    return new Response("Deploy hook unreachable", { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    return new Response(`Deploy hook failed: ${res.status}`, { status: 502 });
  }

  return new Response(JSON.stringify({ triggered: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
