import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(req, res);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthRoute = req.nextUrl.pathname.startsWith("/login");

  if (!session && !isAuthRoute) {
    const redirectUrl = new URL("/login", req.url);
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
