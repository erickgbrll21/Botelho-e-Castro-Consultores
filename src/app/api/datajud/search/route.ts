import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import {
  buildDatajudSearchUrl,
  buildNumeroProcessoQuery,
  DATAJUD_WIKI_PUBLIC_KEY,
  getDatajudAuthHeader,
  inferDatajudAliasFromCnj20,
  normalizeNumeroProcessoCnj,
  type DatajudTribunalAlias,
} from "@/lib/datajud";

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (
    !profile ||
    !["admin", "diretor", "financeiro"].includes(profile.tipo_usuario)
  ) {
    return NextResponse.json(
      { error: "Acesso negado." },
      { status: profile ? 403 : 401 }
    );
  }

  let body: { numero?: string; tribunal?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const numero = normalizeNumeroProcessoCnj(body.numero ?? "");
  if (numero.length !== 20) {
    return NextResponse.json(
      { error: "Informe o número CNJ completo (20 dígitos)." },
      { status: 400 }
    );
  }

  const manual = body.tribunal?.trim();
  let alias: DatajudTribunalAlias | null = null;

  if (manual && manual !== "auto") {
    if (!manual.startsWith("api_publica_")) {
      return NextResponse.json({ error: "Tribunal inválido." }, { status: 400 });
    }
    alias = manual as DatajudTribunalAlias;
  } else {
    alias = inferDatajudAliasFromCnj20(numero);
  }

  if (!alias) {
    return NextResponse.json(
      {
        error:
          "Não foi possível identificar o tribunal pelo número (ex.: STF/CNJ, justiça militar estadual ou código TR). Escolha o tribunal manualmente.",
      },
      { status: 400 }
    );
  }

  const apiKey = process.env.DATAJUD_API_KEY?.trim() || DATAJUD_WIKI_PUBLIC_KEY;
  const url = buildDatajudSearchUrl(alias);
  const payload = buildNumeroProcessoQuery(numero);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: getDatajudAuthHeader(apiKey),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Resposta inválida do DataJud.", httpStatus: res.status },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const body: Record<string, unknown> = {
        error: "Consulta ao DataJud recusada ou indisponível.",
        httpStatus: res.status,
      };
      if (process.env.NODE_ENV !== "production") {
        body.details = json;
      }
      return NextResponse.json(body, { status: 502 });
    }

    return NextResponse.json({
      tribunal: alias,
      numeroProcesso: numero,
      resultado: json,
    });
  } catch {
    return NextResponse.json(
      { error: "Falha de rede ao contactar o DataJud." },
      { status: 502 }
    );
  }
}
