import type { DemandaStatus } from "@/types/database";
import { diaEmBrasilia, inicioDoDiaISO, labelStatus } from "@/lib/demandas";
import { moduloNaoInstalado } from "@/lib/demandas-queries";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export type ItemRelatorioDemanda = {
  id: string;
  titulo: string;
  descricao: string | null;
  tipoServico: string | null;
  responsavelId: string | null;
  responsavelNome: string;
  protocolo: string | null;
  observacoes: string | null;
  cnpj: string | null;
  empresaNome: string | null;
  empresaFantasia: string | null;
  prazoFinal: string | null;
  status: DemandaStatus;
  concluidaEm: string | null;
  createdAt: string;
  arquivada: boolean;
};

export type GrupoRelatorio = {
  responsavelNome: string;
  itens: ItemRelatorioDemanda[];
};

const MES = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type SituacaoRelatorio =
  | "todas"
  | "finalizadas"
  | "pendentes"
  | "em_andamento";

export function parseSituacaoRelatorio(raw: unknown): SituacaoRelatorio {
  const valor = String(raw ?? "").trim();
  if (
    valor === "finalizadas" ||
    valor === "pendentes" ||
    valor === "em_andamento"
  ) {
    return valor;
  }
  return "todas";
}

export function rotuloSituacao(situacao: SituacaoRelatorio): string {
  if (situacao === "finalizadas") return "Finalizadas";
  if (situacao === "pendentes") return "Pendentes";
  if (situacao === "em_andamento") return "Em andamento";
  return "Todas";
}

function incluiSituacao(
  status: DemandaStatus,
  situacao: SituacaoRelatorio
): boolean {
  if (situacao === "finalizadas") return status === "concluida";
  if (situacao === "pendentes") return status !== "concluida";
  if (situacao === "em_andamento") return status === "em_andamento";
  return true;
}

export function mesAtualBrasilia(agora = new Date()): string {
  return diaEmBrasilia(agora).slice(0, 7);
}

export function parseMesRelatorio(raw: unknown, agora = new Date()): string {
  const valor = String(raw ?? "").trim();
  return MES.test(valor) ? valor : mesAtualBrasilia(agora);
}

export function rotuloMes(mes: string): string {
  const data = new Date(`${mes}-01T12:00:00-03:00`);
  const texto = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(data);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function intervaloMes(mes: string): { inicio: string; fim: string } {
  const match = MES.exec(mes);
  const ano = Number(match?.[1] ?? "1970");
  const mesNumero = Number(match?.[2] ?? "01");
  const proximo =
    mesNumero === 12
      ? `${ano + 1}-01-01`
      : `${ano}-${String(mesNumero + 1).padStart(2, "0")}-01`;
  return {
    inicio: inicioDoDiaISO(`${mes}-01`),
    fim: inicioDoDiaISO(proximo),
  };
}

function nomeResponsavel(nome: string | null | undefined): string {
  const texto = String(nome ?? "").trim();
  return texto || "Sem responsável";
}

export async function expurgarDemandasLegalizacaoConfirmadas(
  supabase: SupabaseLike
): Promise<void> {
  const { error } = await supabase.rpc(
    "expurgar_demandas_legalizacao_confirmadas"
  );
  if (error && !moduloNaoInstalado(error)) {
    console.error("Falha ao expurgar demandas de Legalização:", error.message);
  }
}

export async function fetchRelatorioMensalLegalizacao(
  supabase: SupabaseLike,
  mes: string,
  situacao: SituacaoRelatorio = "todas"
): Promise<{ grupos: GrupoRelatorio[]; total: number; erro: string | null }> {
  const { inicio, fim } = intervaloMes(mes);
  const colunas =
    "id, titulo, descricao, tipo_servico_nome, responsavel_id, responsavel_nome, protocolo, observacoes, cnpj, empresa_nome, empresa_fantasia, prazo_final, status, concluida_em, created_at";

  const [aoVivo, arquivo] = await Promise.all([
    supabase
      .from("demandas_view")
      .select(colunas)
      .eq("setor", "legalizacao")
      .gte("created_at", inicio)
      .lt("created_at", fim)
      .order("created_at", { ascending: true })
      .limit(2000),
    supabase
      .from("demandas_legalizacao_arquivo")
      .select(
        "id, titulo, descricao, tipo_servico_nome, responsavel_id, responsavel_nome, protocolo, observacoes, cnpj, empresa_nome, empresa_fantasia, prazo_final, concluida_em, created_at"
      )
      .gte("created_at", inicio)
      .lt("created_at", fim)
      .order("created_at", { ascending: true })
      .limit(2000),
  ]);

  if (aoVivo.error && moduloNaoInstalado(aoVivo.error)) {
    return {
      grupos: [],
      total: 0,
      erro: "O módulo de demandas ainda não está habilitado no banco.",
    };
  }
  if (aoVivo.error) {
    return { grupos: [], total: 0, erro: aoVivo.error.message };
  }

  const porId = new Map<string, ItemRelatorioDemanda>();

  for (const row of aoVivo.data ?? []) {
    porId.set(row.id, {
      id: row.id,
      titulo: row.titulo,
      descricao: row.descricao,
      tipoServico: row.tipo_servico_nome,
      responsavelId: row.responsavel_id,
      responsavelNome: nomeResponsavel(row.responsavel_nome),
      protocolo: row.protocolo,
      observacoes: row.observacoes,
      cnpj: row.cnpj,
      empresaNome: row.empresa_nome,
      empresaFantasia: row.empresa_fantasia,
      prazoFinal: row.prazo_final,
      status: row.status,
      concluidaEm: row.concluida_em,
      createdAt: row.created_at,
      arquivada: false,
    });
  }

  if (!arquivo.error) {
    for (const row of arquivo.data ?? []) {
      if (porId.has(row.id)) continue;
      porId.set(row.id, {
        id: row.id,
        titulo: row.titulo,
        descricao: row.descricao,
        tipoServico: row.tipo_servico_nome,
        responsavelId: row.responsavel_id,
        responsavelNome: nomeResponsavel(row.responsavel_nome),
        protocolo: row.protocolo,
        observacoes: row.observacoes,
        cnpj: row.cnpj,
        empresaNome: row.empresa_nome,
        empresaFantasia: row.empresa_fantasia,
        prazoFinal: row.prazo_final,
        status: "concluida",
        concluidaEm: row.concluida_em,
        createdAt: row.created_at,
        arquivada: true,
      });
    }
  }

  const gruposMap = new Map<string, ItemRelatorioDemanda[]>();
  let total = 0;
  for (const item of porId.values()) {
    if (!incluiSituacao(item.status, situacao)) continue;
    total += 1;
    const lista = gruposMap.get(item.responsavelNome) ?? [];
    lista.push(item);
    gruposMap.set(item.responsavelNome, lista);
  }

  const grupos = [...gruposMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
    .map(([responsavelNome, itens]) => ({
      responsavelNome,
      itens: itens.sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));

  return { grupos, total, erro: null };
}

export function resumoStatusRelatorio(grupos: GrupoRelatorio[]) {
  const contagem: Record<DemandaStatus, number> = {
    pendente: 0,
    em_andamento: 0,
    aguardando_confirmacao: 0,
    concluida: 0,
  };
  for (const grupo of grupos) {
    for (const item of grupo.itens) contagem[item.status] += 1;
  }
  return contagem;
}

export { labelStatus };
