import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { FETCH_HEADERS_BROWSER_LIKE } from "@/lib/public-fetch-headers";

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
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { ...FETCH_HEADERS_BROWSER_LIKE },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Consulta indisponível" },
        { status: res.status === 404 ? 404 : 502 }
      );
    }
    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Falha na consulta" }, { status: 502 });
  }
}
