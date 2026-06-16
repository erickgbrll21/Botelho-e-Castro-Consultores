"use server";

import { revalidatePath } from "next/cache";
import { requireAdminOrDiretorProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { onlyDigits } from "@/lib/brasilapi-cnpj";
import {
  clienteEnderecoIncompleto,
  mapCnpjNormalizedToEnderecoPatch,
  patchEnderecoUtilizavel,
  type ClienteEnderecoRow,
} from "@/lib/cliente-endereco";
import { lookupCnpjPublic } from "@/lib/cnpj-lookup-providers";
import { registrarLog } from "@/lib/logs";

const PAUSA_ENTRE_CONSULTAS_MS = 700;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type SincronizarEnderecosResultado = {
  ok: number;
  falha: number;
  ignorados: number;
  total: number;
  pendentes: number;
  detalhes: string[];
};

/**
 * Preenche endereços incompletos consultando CNPJ (BrasilAPI → Receitaws → cnpj.ws).
 * Apenas campos de endereço são atualizados.
 */
export async function sincronizarEnderecosClientesPelaReceita(): Promise<SincronizarEnderecosResultado> {
  await requireAdminOrDiretorProfile();
  const supabase = await createSupabaseServerClient();

  const { data: rows, error: listErr } = await (supabase.from("clientes") as any)
    .select(
      "id, razao_social, cnpj, cep, logradouro, bairro, complemento, cidade, estado"
    )
    .order("razao_social", { ascending: true });

  if (listErr) {
    throw new Error(listErr.message || "Não foi possível listar clientes.");
  }

  const todos = (rows ?? []) as (ClienteEnderecoRow & {
    id: string;
    razao_social: string;
    cnpj: string;
  })[];

  const pendentes = todos.filter((r) => clienteEnderecoIncompleto(r));
  const ignorados = todos.length - pendentes.length;

  const detalhes: string[] = [];
  let ok = 0;
  let falha = 0;

  for (const row of pendentes) {
    const digits = onlyDigits(String(row.cnpj ?? ""));
    if (digits.length !== 14) {
      falha++;
      detalhes.push(`${row.razao_social}: CNPJ inválido (${row.cnpj})`);
      await sleep(PAUSA_ENTRE_CONSULTAS_MS);
      continue;
    }

    try {
      const { status, body } = await lookupCnpjPublic(digits);

      if (status !== 200 || body.error) {
        falha++;
        detalhes.push(
          `${row.razao_social}: consulta CNPJ indisponível (${body.error ?? status})`
        );
        await sleep(PAUSA_ENTRE_CONSULTAS_MS);
        continue;
      }

      const patch = mapCnpjNormalizedToEnderecoPatch(body);
      if (!patchEnderecoUtilizavel(patch)) {
        falha++;
        detalhes.push(
          `${row.razao_social}: API não retornou endereço completo (fonte: ${body._meta?.api ?? "?"})`
        );
        await sleep(PAUSA_ENTRE_CONSULTAS_MS);
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

    await sleep(PAUSA_ENTRE_CONSULTAS_MS);
  }

  await registrarLog("Sincronização de endereços (CNPJ / Receita)", {
    ok,
    falha,
    ignorados,
    pendentes: pendentes.length,
    total: todos.length,
  });

  revalidatePath("/clientes");
  revalidatePath("/dashboard");

  return {
    ok,
    falha,
    ignorados,
    total: todos.length,
    pendentes: pendentes.length,
    detalhes: detalhes.slice(0, 80),
  };
}

/** Contagem rápida para aviso na UI (admin). */
export async function contarClientesEnderecoIncompleto(): Promise<number> {
  await requireAdminOrDiretorProfile();
  const supabase = await createSupabaseServerClient();

  const { data: rows, error } = await (supabase.from("clientes") as any).select(
    "logradouro, cidade, estado"
  );

  if (error || !rows) return 0;

  return (rows as ClienteEnderecoRow[]).filter((r) => clienteEnderecoIncompleto(r))
    .length;
}
