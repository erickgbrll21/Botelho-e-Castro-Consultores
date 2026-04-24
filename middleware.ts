import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSessionClearingStaleRefresh } from "@/lib/supabase/clear-stale-auth";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rate-limit";

function rateLimitResponse(retryAfterSec: number, isApi: boolean) {
  if (isApi) {
    return NextResponse.json(
      { error: "Muitas requisições. Aguarde e tente novamente." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }
  return new NextResponse(
    "Muitas tentativas. Aguarde um momento e tente novamente.",
    {
      status: 429,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    process.env.NODE_ENV === "production" &&
    (!supabaseUrl || !supabaseKey)
  ) {
    if (isApi) {
      return NextResponse.json(
        { error: "Configuração do servidor incompleta (Supabase)." },
        { status: 503 }
      );
    }
    return new NextResponse(
      "Serviço indisponível: configuração incompleta.",
      {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      }
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({
      request: { headers: req.headers },
    });
  }

  const ip = clientIpFromRequest(req);

  if (pathname.startsWith("/login")) {
    const r = checkRateLimit(`login:${ip}`, 100, 60_000);
    if (!r.ok) return rateLimitResponse(r.retryAfterSec, false);
  }

  if (pathname.startsWith("/api/cnpj/ws")) {
    const r = checkRateLimit(`api-cnpj:${ip}`, 50, 60_000);
    if (!r.ok) return rateLimitResponse(r.retryAfterSec, true);
  }

  if (pathname.startsWith("/api/datajud")) {
    const r = checkRateLimit(`api-datajud:${ip}`, 35, 60_000);
    if (!r.ok) return rateLimitResponse(r.retryAfterSec, true);
  }

  if (pathname === "/api/clientes/import" && req.method === "POST") {
    const r = checkRateLimit(`api-import:${ip}`, 12, 600_000);
    if (!r.ok) return rateLimitResponse(r.retryAfterSec, true);
  }

  if (pathname.startsWith("/api/ai/")) {
    const r = checkRateLimit(`api-ai:${ip}`, 25, 60_000);
    if (!r.ok) return rateLimitResponse(r.retryAfterSec, true);
  }

  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        req.cookies.set(name, value);
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        req.cookies.delete(name);
        res = NextResponse.next({
          request: {
            headers: req.headers,
          },
        });
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });

  const session = await getSessionClearingStaleRefresh(supabase);

  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isApi) {
    if (!session) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }
    return res;
  }

  const isAuthRoute = pathname.startsWith("/login");

  if (!session && !isAuthRoute) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
