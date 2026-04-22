import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { FETCH_HEADERS_BROWSER_LIKE } from "@/lib/public-fetch-headers";

const TIMEOUT_MS = 5_000;

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { ...FETCH_HEADERS_BROWSER_LIKE },
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!res.ok) {
      console.error("[/api/cnpj/cnpjws] publica.cnpj.ws falhou", {
        status: res.status,
        cnpj: digits,
      });
      return NextResponse.json(
        { error: "Consulta indisponível" },
        { status: res.status === 404 ? 404 : 503 }
      );
    }

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/cnpj/cnpjws] erro ao consultar publica.cnpj.ws", {
      cnpj: digits,
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Falha na consulta" }, { status: 503 });
  }
}

