import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { FETCH_HEADERS_BROWSER_LIKE } from "@/lib/public-fetch-headers";

const TIMEOUT_MS = 5_000;
const CACHE_TTL_MS = 10 * 60_000;
const STALE_IF_ERROR_MS = 24 * 60 * 60_000; // 24h
const cache = new Map<
  string,
  { expiresAt: number; staleUntil: number; payload: unknown }
>();

export async function GET(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const raw = req.nextUrl.searchParams.get("cnpj") ?? "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    const now = Date.now();
    const cached = cache.get(digits);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.payload);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        ...FETCH_HEADERS_BROWSER_LIKE,
      },
    }).finally(() => clearTimeout(timeout));

    if (res.status === 404) {
      return NextResponse.json(
        { error: "CNPJ não encontrado." },
        { status: 404 }
      );
    }

    if (res.status === 429) {
      const payload = { error: "Serviço indisponível no momento" };
      const retryAfter = res.headers.get("retry-after");
      console.error("[/api/cnpj/ws] BrasilAPI rate limited (429)", {
        cnpj: digits,
        retryAfter,
      });
      return NextResponse.json(payload, {
        status: 503,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      });
    }

    if (!res.ok) {
      const payload = { error: "Serviço indisponível no momento" };
      console.error("[/api/cnpj/ws] BrasilAPI falhou", {
        status: res.status,
        cnpj: digits,
      });
      if (cached && cached.staleUntil > now) {
        return NextResponse.json(cached.payload, {
          headers: { "X-Cache": "stale" },
        });
      }
      return NextResponse.json(payload, { status: 503 });
    }

    const data: unknown = await res.json();
    cache.set(digits, {
      expiresAt: now + CACHE_TTL_MS,
      staleUntil: now + STALE_IF_ERROR_MS,
      payload: data,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/cnpj/ws] erro ao consultar BrasilAPI", {
      cnpj: digits,
      err: err instanceof Error ? err.message : String(err),
    });
    const now = Date.now();
    const cached = cache.get(digits);
    if (cached && cached.staleUntil > now) {
      return NextResponse.json(cached.payload, {
        headers: { "X-Cache": "stale" },
      });
    }
    return NextResponse.json(
      { error: "Serviço indisponível no momento" },
      { status: 503 }
    );
  }
}
