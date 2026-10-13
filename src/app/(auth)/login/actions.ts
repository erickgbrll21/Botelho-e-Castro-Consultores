"use server";

import { headers } from "next/headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { serverLog } from "@/lib/server-log";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";

const JANELA_MS = 15 * 60 * 1000;
const MAX_FALHAS_EMAIL = 5;
/** Escritório inteiro costuma sair pelo mesmo IP; o limite por IP é mais folgado. */
const MAX_FALHAS_IP = 30;
const MAX_TENTATIVAS_IP_MEMORIA = 100;
const MSG_CREDENCIAIS = "E-mail ou senha inválidos.";
const MSG_CAPTCHA = "Confirme a verificação de segurança (CAPTCHA) e tente novamente.";

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; bloqueadoPorSeg?: number };

async function clientIp(): Promise<string> {
  const h = await headers();
  const raw =
    h.get("x-vercel-forwarded-for") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0];
  return (raw?.trim() || "desconhecido").slice(0, 64);
}

type Tentativas = {
  falhasEmail: number;
  falhasIp: number;
  maisAntiga: number | null;
};

/** Conta falhas recentes no banco; `null` quando o banco não está disponível. */
async function contarFalhas(email: string, ip: string): Promise<Tentativas | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const admin = createSupabaseServiceRoleClient();
    const desde = new Date(Date.now() - JANELA_MS).toISOString();
    const [porEmail, porIp] = await Promise.all([
      (admin.from("login_tentativas" as never) as any)
        .select("created_at")
        .eq("email", email)
        .gte("created_at", desde)
        .order("created_at", { ascending: true })
        .limit(MAX_FALHAS_EMAIL + 1),
      (admin.from("login_tentativas" as never) as any)
        .select("id", { count: "exact", head: true })
        .eq("ip", ip)
        .gte("created_at", desde),
    ]);
    if (porEmail.error || porIp.error) return null;
    const linhas = (porEmail.data ?? []) as { created_at: string }[];
    return {
      falhasEmail: linhas.length,
      falhasIp: porIp.count ?? 0,
      maisAntiga: linhas[0] ? new Date(linhas[0].created_at).getTime() : null,
    };
  } catch {
    return null;
  }
}

async function registrarFalha(email: string, ip: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const admin = createSupabaseServiceRoleClient();
    await (admin.from("login_tentativas" as never) as any).insert({ email, ip });
  } catch {
    // Sem registro persistente; o limite em memória continua valendo.
  }
}

async function limparFalhas(email: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const admin = createSupabaseServiceRoleClient();
    await (admin.from("login_tentativas" as never) as any).delete().eq("email", email);
  } catch {
    // Falhas antigas expiram sozinhas pela janela de tempo.
  }
}

function msgBloqueio(segundos: number): string {
  const min = Math.max(1, Math.ceil(segundos / 60));
  return `Muitas tentativas de login. Aguarde ${min} minuto${min > 1 ? "s" : ""} e tente novamente.`;
}

export async function signInAction(
  emailRaw: string,
  password: string,
  captchaTokenRaw?: string | null
): Promise<LoginResult> {
  const email = String(emailRaw ?? "").trim().toLowerCase().slice(0, 254);
  const senha = String(password ?? "");
  if (!email || !senha || senha.length > 128) {
    return { ok: false, error: MSG_CREDENCIAIS };
  }

  const captchaToken = String(captchaTokenRaw ?? "").slice(0, 4096) || undefined;
  if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken) {
    return { ok: false, error: MSG_CAPTCHA };
  }

  const ip = await clientIp();

  // Limite em memória: barra rajadas mesmo se o banco estiver indisponível.
  for (const rajada of [
    checkRateLimit(`login:ip:${ip}`, MAX_TENTATIVAS_IP_MEMORIA, JANELA_MS),
    checkRateLimit(`login:email:${email}`, MAX_FALHAS_EMAIL * 2, JANELA_MS),
  ]) {
    if (!rajada.ok) {
      serverLog("auth/login", "warn", "Login bloqueado (rajada)", { ip });
      return { ok: false, error: msgBloqueio(rajada.retryAfterSec), bloqueadoPorSeg: rajada.retryAfterSec };
    }
  }

  const tentativas = await contarFalhas(email, ip);
  if (tentativas) {
    if (tentativas.falhasEmail >= MAX_FALHAS_EMAIL && tentativas.maisAntiga) {
      const seg = Math.ceil((tentativas.maisAntiga + JANELA_MS - Date.now()) / 1000);
      serverLog("auth/login", "warn", "Login bloqueado (conta)", { ip });
      return { ok: false, error: msgBloqueio(seg), bloqueadoPorSeg: seg };
    }
    if (tentativas.falhasIp >= MAX_FALHAS_IP) {
      serverLog("auth/login", "warn", "Login bloqueado (IP)", { ip });
      return {
        ok: false,
        error: msgBloqueio(JANELA_MS / 1000),
        bloqueadoPorSeg: JANELA_MS / 1000,
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
    options: captchaToken ? { captchaToken } : undefined,
  });

  if (error) {
    if (/captcha/i.test(error.message)) {
      serverLog("auth/login", "warn", "CAPTCHA recusado", { ip });
      return { ok: false, error: MSG_CAPTCHA };
    }
    const credencialInvalida =
      error.status === 400 || /invalid login credentials/i.test(error.message);
    if (!credencialInvalida) {
      serverLog("auth/login", "error", "Falha no Supabase Auth", {
        status: error.status,
        message: error.message,
      });
      return {
        ok: false,
        error:
          error.status === 429
            ? msgBloqueio(5 * 60)
            : "Não foi possível entrar agora. Tente novamente em instantes.",
      };
    }

    await registrarFalha(email, ip);
    // Atraso progressivo para dificultar automação.
    const falhas = (tentativas?.falhasEmail ?? 0) + 1;
    await new Promise((r) => setTimeout(r, Math.min(400 * falhas, 2000)));

    const restantes = MAX_FALHAS_EMAIL - falhas;
    return {
      ok: false,
      error:
        tentativas && restantes > 0 && restantes <= 2
          ? `${MSG_CREDENCIAIS} Restam ${restantes} tentativa${restantes > 1 ? "s" : ""} antes do bloqueio temporário.`
          : MSG_CREDENCIAIS,
    };
  }

  await limparFalhas(email);
  return { ok: true };
}
