import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../src/pages/api/trigger-build";

const SECRET = "fixture-secret";
const HOOK_URL = "https://hook.invalid/deploy/secret-token";

function call(): Promise<Response> {
  const request = new Request("https://example.test/api/trigger-build", {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
  return GET({ request } as Parameters<typeof GET>[0]) as Promise<Response>;
}

describe("/api/trigger-build deploy hook failures", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  function setup(fetchImpl: typeof fetch) {
    vi.stubEnv("CRON_SECRET", SECRET);
    vi.stubEnv("VERCEL_DEPLOY_HOOK_URL", HOOK_URL);
    vi.stubGlobal("fetch", fetchImpl);
  }

  it("fetch が reject したら 502 を返し、例外詳細を漏らさない", async () => {
    setup(
      vi.fn(async () => {
        throw new TypeError(`fixture network failure ${HOOK_URL}`);
      }) as unknown as typeof fetch
    );

    const res = await call();
    const body = await res.text();

    expect(res.status).toBe(502);
    expect(body).not.toContain("fixture network failure");
    expect(body).not.toContain(HOOK_URL);
  });

  it("deploy hook が HTTP エラーを返したら 502 を返す", async () => {
    setup(
      vi.fn(
        async () => new Response("nope", { status: 500 })
      ) as unknown as typeof fetch
    );

    const res = await call();

    expect(res.status).toBe(502);
  });

  it("deploy hook が応答しなければ期限で中断し、504 を返す", async () => {
    vi.useFakeTimers();
    try {
      let signal: AbortSignal | undefined;
      setup(
        vi.fn(
          (_url: unknown, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
              signal = init?.signal ?? undefined;
              signal?.addEventListener("abort", () =>
                reject(new Error(`aborted ${HOOK_URL}`))
              );
            })
        ) as unknown as typeof fetch
      );

      const pending = call();
      await vi.advanceTimersByTimeAsync(10_000);
      const res = await pending;
      const body = await res.text();

      expect(signal?.aborted).toBe(true);
      expect(res.status).toBe(504);
      expect(body).not.toContain(HOOK_URL);
    } finally {
      vi.useRealTimers();
    }
  });

  it("deploy hook が成功したら 200 を返す", async () => {
    setup(
      vi.fn(
        async () => new Response("ok", { status: 201 })
      ) as unknown as typeof fetch
    );

    const res = await call();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ triggered: true });
  });
});
