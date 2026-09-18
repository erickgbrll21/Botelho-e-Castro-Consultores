import type { DemandaStatus } from "@/types/database";

/**
 * Regras de domínio do Controle de Demandas.
 *
 * "Atrasada" nunca é gravada como status: é derivada de
 * `prazo_final < agora` com `status <> 'concluida'` (igual à view demandas_view).
 */

export const DEMANDA_STATUS: DemandaStatus[] = [
  "pendente",
  "em_andamento",
  "aguardando_confirmacao",
  "concluida",
];

const STATUS_LABEL: Record<DemandaStatus, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  aguardando_confirmacao: "Confirmada pelo usuário",
  concluida: "Confirmada pelo gestor",
};

export function labelStatus(status: DemandaStatus): string {
  return STATUS_LABEL[status] ?? "Pendente";
}

export function parseStatus(raw: unknown): DemandaStatus | null {
  const v = String(raw ?? "").trim();
  return (DEMANDA_STATUS as string[]).includes(v) ? (v as DemandaStatus) : null;
}

/** Papéis que administram demandas (mesmo conjunto de requireAdminProfile). */
export const PAPEIS_GESTORES = [
  "admin",
  "diretor",
  "financeiro",
  "controladoria",
] as const;

// ---------------------------------------------------------------------------
// Datas — o painel opera no fuso de Brasília (sem horário de verão desde 2019)
// ---------------------------------------------------------------------------

const TIMEZONE = "America/Sao_Paulo";
const OFFSET = "-03:00";

/** Data (YYYY-MM-DD) de um instante no fuso de Brasília. */
export function diaEmBrasilia(value: Date | string = new Date()): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Início do dia (YYYY-MM-DD) em Brasília como instante ISO. */
export function inicioDoDiaISO(dia: string): string {
  return new Date(`${dia}T00:00:00${OFFSET}`).toISOString();
}

/** Início do dia seguinte — usado como limite superior exclusivo. */
export function inicioDoDiaSeguinteISO(dia: string): string {
  const base = new Date(`${dia}T00:00:00${OFFSET}`);
  base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString();
}

export function somarDias(dia: string, dias: number): string {
  const base = new Date(`${dia}T12:00:00${OFFSET}`);
  base.setUTCDate(base.getUTCDate() + dias);
  return diaEmBrasilia(base);
}

/** Primeiro dia do mês (YYYY-MM-DD) do dia informado. */
export function primeiroDiaDoMes(dia: string): string {
  return `${dia.slice(0, 7)}-01`;
}

/** Segunda-feira da semana do dia informado. */
export function inicioDaSemana(dia: string): string {
  const d = new Date(`${dia}T12:00:00${OFFSET}`);
  const diaSemana = d.getUTCDay(); // 0 = domingo
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  return somarDias(dia, -recuo);
}

/** Valor para `<input type="datetime-local">` a partir de um ISO. */
export function paraDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const hora = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hora}:${get("minute")}`;
}

/**
 * Converte o valor de `datetime-local` (ou `date`) informado no formulário
 * para um instante ISO, interpretando-o no fuso de Brasília.
 */
export function prazoFormularioParaISO(raw: unknown): string | null {
  const v = String(raw ?? "").trim();
  if (!v) return null;
  const comHora = v.includes("T") ? v : `${v}T18:00`;
  const d = new Date(`${comHora}${OFFSET}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Situação do prazo
// ---------------------------------------------------------------------------

export type SituacaoPrazo =
  | "concluida"
  | "aguardando_confirmacao"
  | "atrasada"
  | "vence_hoje"
  | "proxima"
  | "no_prazo";

/** Dias (em Brasília) a partir de hoje até o prazo. Negativo = vencido. */
export function diasAteOPrazo(prazoISO: string, agora: Date = new Date()): number {
  const hoje = diaEmBrasilia(agora);
  const prazo = diaEmBrasilia(prazoISO);
  if (!hoje || !prazo) return 0;
  const msDia = 24 * 60 * 60 * 1000;
  const a = new Date(`${hoje}T00:00:00${OFFSET}`).getTime();
  const b = new Date(`${prazo}T00:00:00${OFFSET}`).getTime();
  return Math.round((b - a) / msDia);
}

export function situacaoPrazo(
  demanda: { prazo_final: string; status: DemandaStatus },
  agora: Date = new Date()
): SituacaoPrazo {
  if (demanda.status === "concluida") return "concluida";
  if (demanda.status === "aguardando_confirmacao") {
    return "aguardando_confirmacao";
  }

  const prazo = new Date(demanda.prazo_final);
  if (Number.isNaN(prazo.getTime())) return "no_prazo";
  if (prazo.getTime() < agora.getTime()) return "atrasada";

  const dias = diasAteOPrazo(demanda.prazo_final, agora);
  if (dias <= 0) return "vence_hoje";
  if (dias <= 3) return "proxima";
  return "no_prazo";
}

export function labelSituacaoPrazo(situacao: SituacaoPrazo, dias: number): string {
  switch (situacao) {
    case "concluida":
      return "Confirmada pelo gestor";
    case "aguardando_confirmacao":
      return "Aguardando confirmação do gestor";
    case "atrasada":
      return dias === -1 ? "Atrasada há 1 dia" : `Atrasada há ${Math.abs(dias)} dias`;
    case "vence_hoje":
      return "Vence hoje";
    case "proxima":
      return dias === 1 ? "Vence amanhã" : `Vence em ${dias} dias`;
    default:
      return `Faltam ${dias} dias`;
  }
}

/** Uma demanda está atrasada? (mesma regra da coluna `atrasada` da view) */
export function estaAtrasada(
  demanda: { prazo_final: string; status: DemandaStatus },
  agora: Date = new Date()
): boolean {
  if (demanda.status === "concluida") return false;
  const prazo = new Date(demanda.prazo_final);
  return !Number.isNaN(prazo.getTime()) && prazo.getTime() < agora.getTime();
}

// ---------------------------------------------------------------------------
// Pastas e documentos
// ---------------------------------------------------------------------------

/**
 * Só liberamos "Abrir pasta" para http/https. Caminhos de rede (X:\..., \\servidor\...)
 * não são URL navegável no browser — para eles usamos "Copiar caminho".
 */
export function urlPastaNavegavel(valor: string | null | undefined): string | null {
  const v = valor?.trim();
  if (!v) return null;
  try {
    const url = new URL(v);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Filtros (dashboard, listagens)
// ---------------------------------------------------------------------------

export type StatusFiltro = DemandaStatus | "atrasada" | "";
export type PrazoFiltro = "" | "vence_hoje" | "proximos_7" | "atrasadas";
export type PeriodoFiltro = "" | "hoje" | "semana" | "mes" | "personalizado";

export type DemandaFiltros = {
  q: string;
  responsavel: string;
  tipo: string;
  status: StatusFiltro;
  prazo: PrazoFiltro;
  periodo: PeriodoFiltro;
  de: string;
  ate: string;
  pagina: number;
};

export type DemandaFiltrosParams = {
  q?: string;
  responsavel?: string;
  tipo?: string;
  status?: string;
  prazo?: PrazoFiltro | string;
  periodo?: PeriodoFiltro | string;
  de?: string;
  ate?: string;
  pagina?: string;
};

const DIA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseDia(raw: unknown): string {
  const v = String(raw ?? "").trim();
  return DIA_REGEX.test(v) ? v : "";
}

function parseUuid(raw: unknown): string {
  const v = String(raw ?? "").trim();
  return UUID_REGEX.test(v) ? v : "";
}

export function parseFiltros(params: DemandaFiltrosParams): DemandaFiltros {
  const statusRaw = String(params.status ?? "").trim();
  const status: StatusFiltro =
    statusRaw === "atrasada"
      ? "atrasada"
      : (parseStatus(statusRaw) ?? "");

  const prazoRaw = String(params.prazo ?? "").trim();
  const prazo: PrazoFiltro = (
    ["vence_hoje", "proximos_7", "atrasadas"] as string[]
  ).includes(prazoRaw)
    ? (prazoRaw as PrazoFiltro)
    : "";

  const periodoRaw = String(params.periodo ?? "").trim();
  const periodo: PeriodoFiltro = (
    ["hoje", "semana", "mes", "personalizado"] as string[]
  ).includes(periodoRaw)
    ? (periodoRaw as PeriodoFiltro)
    : "";

  const paginaNum = Number.parseInt(String(params.pagina ?? "1"), 10);

  return {
    q: String(params.q ?? "").trim().slice(0, 120),
    responsavel: parseUuid(params.responsavel),
    tipo: parseUuid(params.tipo),
    status,
    prazo,
    periodo,
    de: parseDia(params.de),
    ate: parseDia(params.ate),
    pagina: Number.isFinite(paginaNum) && paginaNum > 1 ? paginaNum : 1,
  };
}

/**
 * Intervalo de criação (ISO) derivado do período selecionado.
 * Datas digitadas (de/até) têm precedência sobre os atalhos de período.
 */
export function intervaloPeriodo(
  filtros: DemandaFiltros,
  agora: Date = new Date()
): { deISO: string | null; ateISO: string | null } {
  const hoje = diaEmBrasilia(agora);

  if (filtros.de || filtros.ate) {
    return {
      deISO: filtros.de ? inicioDoDiaISO(filtros.de) : null,
      ateISO: filtros.ate ? inicioDoDiaSeguinteISO(filtros.ate) : null,
    };
  }

  if (filtros.periodo === "hoje") {
    return { deISO: inicioDoDiaISO(hoje), ateISO: inicioDoDiaSeguinteISO(hoje) };
  }
  if (filtros.periodo === "semana") {
    const inicio = inicioDaSemana(hoje);
    return {
      deISO: inicioDoDiaISO(inicio),
      ateISO: inicioDoDiaSeguinteISO(somarDias(inicio, 6)),
    };
  }
  if (filtros.periodo === "mes") {
    return {
      deISO: inicioDoDiaISO(primeiroDiaDoMes(hoje)),
      ateISO: null,
    };
  }

  return {
    deISO: filtros.de ? inicioDoDiaISO(filtros.de) : null,
    ateISO: filtros.ate ? inicioDoDiaSeguinteISO(filtros.ate) : null,
  };
}

export function temFiltroAtivo(filtros: DemandaFiltros): boolean {
  return Boolean(
    filtros.q ||
      filtros.responsavel ||
      filtros.tipo ||
      filtros.status ||
      filtros.prazo ||
      filtros.periodo ||
      filtros.de ||
      filtros.ate
  );
}

/** Serializa filtros preservados em links (paginação, filtros rápidos). */
export function queryStringFiltros(
  filtros: DemandaFiltros,
  override: Partial<DemandaFiltros> = {}
): string {
  const merged = { ...filtros, ...override };
  const sp = new URLSearchParams();

  if (merged.q) sp.set("q", merged.q);
  if (merged.responsavel) sp.set("responsavel", merged.responsavel);
  if (merged.tipo) sp.set("tipo", merged.tipo);
  if (merged.status) sp.set("status", merged.status);
  if (merged.prazo) sp.set("prazo", merged.prazo);
  if (merged.periodo) sp.set("periodo", merged.periodo);
  if (merged.de) sp.set("de", merged.de);
  if (merged.ate) sp.set("ate", merged.ate);
  if (merged.pagina > 1) sp.set("pagina", String(merged.pagina));

  const s = sp.toString();
  return s ? `?${s}` : "";
}
