import { serverLog } from "@/lib/server-log";
import { formatDateTimePtBR } from "@/lib/format-date";
import { labelStatus } from "@/lib/demandas";
import type { DemandaStatus } from "@/types/database";

/** Cliente Supabase com tipagem solta (mesmo padrão de `src/lib/logs.ts`). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

/** Ações registradas no histórico da demanda. */
export type AcaoHistorico =
  | "Criação"
  | "Responsável atribuído"
  | "Alteração de responsável"
  | "Alteração de prazo"
  | "Alteração de protocolo"
  | "Alteração de status"
  | "Alteração de observações"
  | "Alteração de dados"
  | "Confirmação do usuário"
  | "Confirmação do gestor"
  | "Reabertura";

export type EntradaHistorico = {
  acao: AcaoHistorico;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNovo?: string | null;
};

/**
 * Grava o histórico. Nunca interrompe a operação principal: uma falha aqui é
 * registrada no log do servidor, mas a alteração da demanda permanece válida.
 */
export async function registrarHistoricoDemanda(
  supabase: SupabaseLike,
  demandaId: string,
  autor: { id: string; nome: string },
  entradas: EntradaHistorico[]
): Promise<void> {
  const linhas = entradas
    .filter((e) => e.acao)
    .map((e) => ({
      demanda_id: demandaId,
      usuario_id: autor.id,
      usuario_nome: autor.nome,
      acao: e.acao,
      campo_alterado: e.campo ?? null,
      valor_anterior: e.valorAnterior ?? null,
      valor_novo: e.valorNovo ?? null,
    }));

  if (linhas.length === 0) return;

  try {
    const { error } = await supabase.from("historico_demandas").insert(linhas);
    if (error) {
      serverLog("demandas:historico", "error", error.message, {
        demanda_id: demandaId,
      });
    }
  } catch (e) {
    serverLog("demandas:historico", "error", "falha ao registrar histórico", {
      demanda_id: demandaId,
      err: e instanceof Error ? e.message : String(e),
    });
  }
}

function textoOuVazio(valor: string | null | undefined): string {
  const v = valor?.trim();
  return v ? v : "—";
}

function textoPrazo(iso: string | null | undefined): string {
  return formatDateTimePtBR(iso, { dateStyle: "short", timeStyle: "short" });
}

type CamposComparaveis = {
  titulo: string;
  descricao: string | null;
  tipo_servico_id: string | null;
  responsavel_id: string | null;
  prazo_final: string;
  protocolo: string | null;
  observacoes: string | null;
  url_pasta: string | null;
  caminho_pasta: string | null;
  status: DemandaStatus;
};

/**
 * Monta as entradas de histórico comparando o estado anterior com o novo.
 * `nomesUsuarios` e `nomesTipos` traduzem ids para texto legível.
 */
export function diffDemanda(
  antes: CamposComparaveis,
  depois: Partial<CamposComparaveis>,
  dicionarios: {
    nomesUsuarios?: Map<string, string>;
    nomesTipos?: Map<string, string>;
  } = {}
): EntradaHistorico[] {
  const entradas: EntradaHistorico[] = [];
  const nomeUsuario = (id: string | null | undefined) =>
    id ? (dicionarios.nomesUsuarios?.get(id) ?? "Usuário") : "Sem responsável";
  const nomeTipo = (id: string | null | undefined) =>
    id ? (dicionarios.nomesTipos?.get(id) ?? "Tipo de serviço") : "—";

  if (depois.titulo !== undefined && depois.titulo !== antes.titulo) {
    entradas.push({
      acao: "Alteração de dados",
      campo: "Título",
      valorAnterior: antes.titulo,
      valorNovo: depois.titulo,
    });
  }

  if (
    depois.descricao !== undefined &&
    (depois.descricao ?? "") !== (antes.descricao ?? "")
  ) {
    entradas.push({
      acao: "Alteração de dados",
      campo: "Descrição",
      valorAnterior: textoOuVazio(antes.descricao),
      valorNovo: textoOuVazio(depois.descricao),
    });
  }

  if (
    depois.tipo_servico_id !== undefined &&
    depois.tipo_servico_id !== antes.tipo_servico_id
  ) {
    entradas.push({
      acao: "Alteração de dados",
      campo: "Tipo de serviço",
      valorAnterior: nomeTipo(antes.tipo_servico_id),
      valorNovo: nomeTipo(depois.tipo_servico_id),
    });
  }

  if (
    depois.responsavel_id !== undefined &&
    depois.responsavel_id !== antes.responsavel_id
  ) {
    entradas.push({
      acao: "Alteração de responsável",
      campo: "Responsável",
      valorAnterior: nomeUsuario(antes.responsavel_id),
      valorNovo: nomeUsuario(depois.responsavel_id),
    });
  }

  if (
    depois.prazo_final !== undefined &&
    new Date(depois.prazo_final).getTime() !==
      new Date(antes.prazo_final).getTime()
  ) {
    entradas.push({
      acao: "Alteração de prazo",
      campo: "Prazo final",
      valorAnterior: textoPrazo(antes.prazo_final),
      valorNovo: textoPrazo(depois.prazo_final),
    });
  }

  if (
    depois.protocolo !== undefined &&
    (depois.protocolo ?? "") !== (antes.protocolo ?? "")
  ) {
    entradas.push({
      acao: "Alteração de protocolo",
      campo: "Protocolo",
      valorAnterior: textoOuVazio(antes.protocolo),
      valorNovo: textoOuVazio(depois.protocolo),
    });
  }

  if (
    depois.observacoes !== undefined &&
    (depois.observacoes ?? "") !== (antes.observacoes ?? "")
  ) {
    entradas.push({
      acao: "Alteração de observações",
      campo: "Observações",
      valorAnterior: textoOuVazio(antes.observacoes),
      valorNovo: textoOuVazio(depois.observacoes),
    });
  }

  if (
    depois.url_pasta !== undefined &&
    (depois.url_pasta ?? "") !== (antes.url_pasta ?? "")
  ) {
    entradas.push({
      acao: "Alteração de dados",
      campo: "URL da pasta",
      valorAnterior: textoOuVazio(antes.url_pasta),
      valorNovo: textoOuVazio(depois.url_pasta),
    });
  }

  if (
    depois.caminho_pasta !== undefined &&
    (depois.caminho_pasta ?? "") !== (antes.caminho_pasta ?? "")
  ) {
    entradas.push({
      acao: "Alteração de dados",
      campo: "Caminho da pasta",
      valorAnterior: textoOuVazio(antes.caminho_pasta),
      valorNovo: textoOuVazio(depois.caminho_pasta),
    });
  }

  if (depois.status !== undefined && depois.status !== antes.status) {
    const acao: AcaoHistorico =
      depois.status === "concluida"
        ? "Confirmação do gestor"
        : depois.status === "aguardando_confirmacao"
          ? "Confirmação do usuário"
          : antes.status === "concluida" ||
              antes.status === "aguardando_confirmacao"
            ? "Reabertura"
            : "Alteração de status";
    entradas.push({
      acao,
      campo: "Status",
      valorAnterior: labelStatus(antes.status),
      valorNovo: labelStatus(depois.status),
    });
  }

  return entradas;
}
