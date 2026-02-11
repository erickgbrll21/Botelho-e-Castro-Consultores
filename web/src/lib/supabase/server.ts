import "server-only";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/database";

function assertEnv(key: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${key}`);
  }
  return value;
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = assertEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseKey = assertEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const getCookie = (name: string) => {
    const getter = (cookieStore as unknown as { get?: (name: string) => { value?: string } | undefined }).get;
    if (typeof getter === "function") {
      return getter.call(cookieStore, name)?.value;
    }
    return undefined;
  };

  const setCookie = (name: string, value: string, options: CookieOptions) => {
    const setter = (cookieStore as unknown as { set?: (input: { name: string; value: string } & CookieOptions) => void }).set;
    if (typeof setter === "function") {
      try {
        setter.call(cookieStore, { name, value, ...options });
      } catch {
        // Em rotas não Server Action, Next não permite set-cookie; ignoramos silenciosamente.
      }
    }
  };

  const deleteCookie = (name: string, options: CookieOptions) => {
    const deleter = (cookieStore as unknown as { delete?: (input: { name: string } & CookieOptions) => void }).delete;
    if (typeof deleter === "function") {
      try {
        deleter.call(cookieStore, { name, ...options });
      } catch {
        // Ignora se não for permitido no contexto atual.
      }
    }
  };

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return getCookie(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        setCookie(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        deleteCookie(name, options);
      },
    },
  });
}

export function createSupabaseServiceRoleClient() {
  const supabaseUrl = assertEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseKey = assertEnv(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get() {
        return "";
      },
      set() {},
      remove() {},
    },
  });
}

export function createSupabaseMiddlewareClient(
  req: NextRequest,
  res: NextResponse
) {
  const supabaseUrl = assertEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  );
  const supabaseKey = assertEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
        // Mantém o req em sincronia para leituras subsequentes no mesmo ciclo
        req.cookies.set(name, value);
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        req.cookies.delete(name);
      },
    },
  });
}
