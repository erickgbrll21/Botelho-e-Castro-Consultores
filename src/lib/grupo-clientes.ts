export type EmpresaGrupoResumo = {
  id: string;
  razao_social: string | null;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  ativo: boolean | null;
  situacao_empresa: string | null;
  tipo_unidade: "Matriz" | "Filial" | null;
  identificacao_filial: string | null;
};

const EMPRESAS_GRUPO_SELECT =
  "id, razao_social, cnpj, cidade, estado, ativo, situacao_empresa, tipo_unidade, identificacao_filial";

/** Empresas vinculadas ao grupo (FK `grupo_id` + legado `grupo_economico` por nome). */
export async function fetchEmpresasDoGrupo(
  supabase: any,
  grupoId: string,
  grupoNome: string
): Promise<EmpresaGrupoResumo[]> {
  const byId = new Map<string, EmpresaGrupoResumo>();

  const { data: porFk, error: fkErr } = await supabase
    .from("clientes")
    .select(EMPRESAS_GRUPO_SELECT)
    .eq("grupo_id", grupoId)
    .order("razao_social", { ascending: true });

  if (fkErr) {
    throw new Error(fkErr.message || "Não foi possível listar empresas do grupo.");
  }

  for (const row of porFk ?? []) {
    byId.set(String(row.id), row as EmpresaGrupoResumo);
  }

  const nome = grupoNome.trim();
  if (nome) {
    const { data: porNome, error: nomeErr } = await supabase
      .from("clientes")
      .select(EMPRESAS_GRUPO_SELECT)
      .ilike("grupo_economico", nome)
      .order("razao_social", { ascending: true });

    if (nomeErr) {
      throw new Error(
        nomeErr.message || "Não foi possível listar empresas do grupo (nome legado)."
      );
    }

    for (const row of porNome ?? []) {
      const id = String(row.id);
      if (!byId.has(id)) {
        byId.set(id, row as EmpresaGrupoResumo);
      }
    }
  }

  return Array.from(byId.values()).sort((a, b) =>
    String(a.razao_social ?? "").localeCompare(String(b.razao_social ?? ""), "pt-BR")
  );
}
