"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapBrasilApiJsonToClienteFields,
  onlyDigits,
  type BrasilApiCnpjJson,
} from "@/lib/brasilapi-cnpj";
import { extractInscricoesFromCnpjWsPayload } from "@/lib/cnpj-ws-inscricoes";
import { mapPublicaCnpjWsPayloadToClienteFields } from "@/lib/cnpj-ws-publica-adapter";
import {
  CNPJ_WS_PUBLIC_MIN_INTERVAL_MS,
  FETCH_HEADERS_BROWSER_LIKE,
} from "@/lib/public-fetch-headers";
import { registrarLog } from "@/lib/logs";

const PAUSA_ENTRE_EMPRESAS_MS = 650;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let ultimaConsultaCnpjWs = 0;

async function aguardarJanelaCnpjWsPublica() {
  const decorrido = Date.now() - ultimaConsultaCnpjWs;
  if (
    ultimaConsultaCnpjWs > 0 &&
    decorrido < CNPJ_WS_PUBLIC_MIN_INTERVAL_MS
  ) {
    await sleep(CNPJ_WS_PUBLIC_MIN_INTERVAL_MS - decorrido);
  }
}

function marcarConsultaCnpjWs() {
  ultimaConsultaCnpjWs = Date.now();
}

async function fetchPublicaCnpjWs(digits: string): Promise<Response> {
  await aguardarJanelaCnpjWsPublica();
  const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
    headers: { ...FETCH_HEADERS_BROWSER_LIKE },
    cache: "no-store",
  });
  marcarConsultaCnpjWs();
  return res;
}

function mesclarInscricoesCnpjWs(
  patch: Record<string, unknown>,
  wsPayload: unknown,
  ufHint: string
) {
  const uf = (String(patch.estado ?? ufHint).slice(0, 2) || ufHint).toUpperCase();
  const { inscricao_estadual, inscricao_municipal } =
    extractInscricoesFromCnpjWsPayload(wsPayload, uf);
  if (inscricao_estadual) {
    patch.inscricao_estadual = inscricao_estadual;
  }
  if (inscricao_municipal) {
    patch.inscricao_municipal = inscricao_municipal;
  }
}

export type SincronizarBrasilApiResultado = {
  ok: number;
  falha: number;
  total: number;
  detalhes: string[];
};

/**
 * Atualiza cada cliente: tenta BrasilAPI; em 403/404/outros falhas usa publica.cnpj.ws.
 * Respeita intervalo mínimo da API pública cnpj.ws (~3/min). Administradores apenas.
 */
export async function sincronizarTodosClientesBrasilApi(): Promise<SincronizarBrasilApiResultado> {
  await requireAdminProfile();
  const supabase = await createSupabaseServerClient();

  const { data: rows, error: listErr } = await (supabase.from("clientes") as any)
    .select("id, razao_social, cnpj")
    .order("razao_social", { ascending: true });

  if (listErr || !rows?.length) {
    throw new Error(
      listErr?.message ?? "Não foi possível listar clientes para sincronizar."
    );
  }

  const detalhes: string[] = [];
  let ok = 0;
  let falha = 0;

  for (const row of rows as { id: string; razao_social: string; cnpj: string }[]) {
    const digits = onlyDigits(String(row.cnpj ?? ""));
    if (digits.length !== 14) {
      falha++;
      detalhes.push(`${row.razao_social}: CNPJ inválido (${row.cnpj})`);
      await sleep(PAUSA_ENTRE_EMPRESAS_MS);
      continue;
    }

    try {
      let patch: Record<string, unknown> | null = null;

      const brRes = await fetch(
        `https://brasilapi.com.br/api/cnpj/v1/${digits}`,
        {
          headers: {
            ...FETCH_HEADERS_BROWSER_LIKE,
            Referer: "https://brasilapi.com.br/",
          },
          cache: "no-store",
        }
      );

      if (brRes.ok) {
        const data = (await brRes.json()) as BrasilApiCnpjJson;
        patch = mapBrasilApiJsonToClienteFields(data);

        const faltaIe =
          patch.inscricao_estadual == null ||
          String(patch.inscricao_estadual).trim() === "";
        const faltaIm =
          patch.inscricao_municipal == null ||
          String(patch.inscricao_municipal).trim() === "";

        if (faltaIe || faltaIm) {
          const wsRes = await fetchPublicaCnpjWs(digits);
          if (wsRes.ok) {
            const wsJson: unknown = await wsRes.json();
            mesclarInscricoesCnpjWs(
              patch,
              wsJson,
              String(patch.estado ?? "").slice(0, 2)
            );
          }
        }
      } else {
        const wsRes = await fetchPublicaCnpjWs(digits);
        if (!wsRes.ok) {
          falha++;
          detalhes.push(
            `${row.razao_social}: BrasilAPI ${brRes.status} e cnpj.ws ${wsRes.status}`
          );
          await sleep(PAUSA_ENTRE_EMPRESAS_MS);
          continue;
        }
        const wsJson: unknown = await wsRes.json();
        patch = mapPublicaCnpjWsPayloadToClienteFields(wsJson);
        if (!patch) {
          falha++;
          detalhes.push(
            `${row.razao_social}: cnpj.ws sem dados mapeáveis (BrasilAPI ${brRes.status})`
          );
          await sleep(PAUSA_ENTRE_EMPRESAS_MS);
          continue;
        }
        mesclarInscricoesCnpjWs(patch, wsJson, String(patch.estado ?? ""));
      }

      if (!patch || Object.keys(patch).length === 0) {
        falha++;
        detalhes.push(`${row.razao_social}: resposta sem campos mapeáveis`);
        await sleep(PAUSA_ENTRE_EMPRESAS_MS);
        continue;
      }

      const { error: updErr } = await (supabase.from("clientes") as any)
        .update(patch)
        .eq("id", row.id);

      if (updErr) {
        falha++;
        detalhes.push(`${row.razao_social}: ${updErr.message}`);
      } else {
        ok++;
      }
    } catch (e) {
      falha++;
      detalhes.push(
        `${row.razao_social}: ${e instanceof Error ? e.message : "erro desconhecido"}`
      );
    }

    await sleep(PAUSA_ENTRE_EMPRESAS_MS);
  }

  await registrarLog("Sincronização Receita Federal (BrasilAPI / cnpj.ws)", {
    ok,
    falha,
    total: rows.length,
  });

  revalidatePath("/clientes");
  revalidatePath("/dashboard");
  revalidatePath("/");

  return {
    ok,
    falha,
    total: rows.length,
    detalhes: detalhes.slice(0, 80),
  };
}
