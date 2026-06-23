export type GrupoFiltroOpcao = {
  id: string;
  nome: string;
  valor_contrato: number | null;
};

const LEGACY_PREFIX = "legacy:";
export const SEM_GRUPO_CLIENTES_ID = "__sem_grupo__";

export function isGrupoDetalheLinkId(id: string): boolean {
  return (
    id !== SEM_GRUPO_CLIENTES_ID &&
    !id.startsWith(LEGACY_PREFIX) &&
    id.trim().length > 0
  );
}

function parseValorContrato(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function legacyGrupoId(nome: string): string {
  return `${LEGACY_PREFIX}${encodeURIComponent(nome.trim())}`;
}

function postgrestEqValue(value: string): string {
  if (/[,()]/.test(value) || /\s/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Lista grupos para `<select>`: tabela + nomes legados em `clientes.grupo_economico`. */
export async function fetchGruposParaFiltro(
  supabase: any
): Promise<GrupoFiltroOpcao[]> {
  const byKey = new Map<string, GrupoFiltroOpcao>();

  const { data: fromTable } = await supabase
    .from("grupos_economicos")
    .select("id, nome, valor_contrato")
    .order("nome", { ascending: true });

  for (const g of fromTable ?? []) {
    const id = String(g?.id ?? "").trim();
    const nome = String(g?.nome ?? "").trim();
    if (!id || !nome) continue;
    byKey.set(id, {
      id,
      nome,
      valor_contrato: parseValorContrato(g.valor_contrato),
    });
  }

  const { data: fromClientes, error: clientesErr } = await supabase
    .from("clientes")
    .select("grupo_id, grupo_economico")
    .or("grupo_id.not.is.null,grupo_economico.not.is.null");

  if (clientesErr) {
    return sortGruposOpcoes(Array.from(byKey.values()));
  }

  const nomesCadastrados = new Set(
    [...byKey.values()].map((g) => g.nome.trim().toLowerCase())
  );

  for (const c of fromClientes ?? []) {
    const id = c.grupo_id ? String(c.grupo_id).trim() : "";
    const nomeLegado =
      typeof c.grupo_economico === "string" ? c.grupo_economico.trim() : "";

    if (id && !byKey.has(id) && nomeLegado) {
      byKey.set(id, { id, nome: nomeLegado, valor_contrato: null });
      nomesCadastrados.add(nomeLegado.toLowerCase());
      continue;
    }

    if (!id && nomeLegado && !nomesCadastrados.has(nomeLegado.toLowerCase())) {
      const legacyId = legacyGrupoId(nomeLegado);
      byKey.set(legacyId, {
        id: legacyId,
        nome: nomeLegado,
        valor_contrato: null,
      });
      nomesCadastrados.add(nomeLegado.toLowerCase());
    }
  }

  return sortGruposOpcoes(Array.from(byKey.values()));
}

function sortGruposOpcoes(list: GrupoFiltroOpcao[]): GrupoFiltroOpcao[] {
  return list.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export function buildGruposMaps(grupos: GrupoFiltroOpcao[]) {
  const gruposById = new Map<
    string,
    { nome: string; valor_contrato: number | null }
  >();
  const gruposByNome = new Map<
    string,
    { id: string; nome: string; valor_contrato: number | null }
  >();

  for (const g of grupos) {
    gruposById.set(g.id, { nome: g.nome, valor_contrato: g.valor_contrato });
    gruposByNome.set(g.nome.toLowerCase(), {
      id: g.id,
      nome: g.nome,
      valor_contrato: g.valor_contrato,
    });
  }

  return { gruposById, gruposByNome };
}

/** Filtra clientes por grupo (FK ou campo legado `grupo_economico`). */
export function applyGrupoFilterOnClienteQuery(
  query: any,
  grupoId: string,
  gruposById: Map<string, { nome: string; valor_contrato: number | null }>
): any {
  const id = grupoId.trim();
  if (!id) return query;

  if (id.startsWith(LEGACY_PREFIX)) {
    const nome = decodeURIComponent(id.slice(LEGACY_PREFIX.length)).trim();
    if (!nome) return query;
    return query.eq("grupo_economico", nome);
  }

  const meta = gruposById.get(id);
  const nome = meta?.nome?.trim();
  if (nome) {
    return query.or(
      `grupo_id.eq.${id},grupo_economico.eq.${postgrestEqValue(nome)}`
    );
  }

  return query.eq("grupo_id", id);
}

export type GrupoClientesSecao = {
  id: string;
  nome: string;
  clientes: any[];
};

/** Resolve o id de grupo usado nas seções (cadastrado, legado ou avulso). */
export function resolveClienteGrupoId(
  cliente: any,
  gruposById: Map<string, { nome: string; valor_contrato: number | null }>,
  gruposByNome: Map<
    string,
    { id: string; nome: string; valor_contrato: number | null }
  >
): string {
  if (cliente.grupo_id) {
    const id = String(cliente.grupo_id).trim();
    if (gruposById.has(id)) return id;
  }

  const gruposRel = cliente.grupos_economicos;
  const nomeRel =
    (Array.isArray(gruposRel) ? gruposRel[0]?.nome : gruposRel?.nome) || "";
  const nomeLegado =
    nomeRel ||
    (typeof cliente.grupo_economico === "string"
      ? cliente.grupo_economico.trim()
      : "");

  if (nomeLegado) {
    const found = gruposByNome.get(nomeLegado.toLowerCase());
    if (found) return found.id;
    return legacyGrupoId(nomeLegado);
  }

  return SEM_GRUPO_CLIENTES_ID;
}

/** Agrupa clientes por grupo para exibição quando o filtro está em "Todos os grupos". */
export function buildSecoesPorGrupo(
  clientes: any[],
  gruposFiltro: GrupoFiltroOpcao[],
  gruposById: Map<string, { nome: string; valor_contrato: number | null }>,
  gruposByNome: Map<
    string,
    { id: string; nome: string; valor_contrato: number | null }
  >
): GrupoClientesSecao[] {
  const buckets = new Map<string, any[]>();

  for (const g of gruposFiltro) {
    buckets.set(g.id, []);
  }
  buckets.set(SEM_GRUPO_CLIENTES_ID, []);

  for (const cliente of clientes) {
    const key = resolveClienteGrupoId(cliente, gruposById, gruposByNome);
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key)!.push(cliente);
  }

  const secoes: GrupoClientesSecao[] = gruposFiltro.map((g) => ({
    id: g.id,
    nome: g.nome,
    clientes: buckets.get(g.id) ?? [],
  }));

  const avulsos = buckets.get(SEM_GRUPO_CLIENTES_ID) ?? [];
  if (avulsos.length > 0) {
    secoes.push({
      id: SEM_GRUPO_CLIENTES_ID,
      nome: "Clientes avulsos",
      clientes: avulsos,
    });
  }

  return secoes;
}
