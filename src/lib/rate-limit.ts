import type { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

/** In-memory (por instância). Adequado a tráfego moderado; em escala usar Redis/Upstash. */
const store = new Map<string, Bucket>();

const MAX_KEYS = 50_000;

function pruneIfNeeded() {
  if (store.size <= MAX_KEYS) return;
  const now = Date.now();
  for (const [k, v] of store) {
    if (now >= v.resetAt) store.delete(k);
  }
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  pruneIfNeeded();
  const now = Date.now();
  let b = store.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)),
    };
  }
  return { ok: true };
}

export function clientIpFromRequest(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 64);
  return "unknown";
}
