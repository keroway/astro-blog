import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  const cronSecret = import.meta.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const deployHookUrl = import.meta.env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    return new Response("VERCEL_DEPLOY_HOOK_URL is not configured", {
      status: 500,
    });
  }

  const res = await fetch(deployHookUrl, { method: "POST" });
  if (!res.ok) {
    return new Response(`Deploy hook failed: ${res.status}`, { status: 502 });
  }

  return new Response(JSON.stringify({ triggered: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
