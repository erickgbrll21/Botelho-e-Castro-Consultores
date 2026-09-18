import type { DemandaStatus } from "@/types/database";
import type { DemandasParaMetricas } from "@/lib/demandas-queries";
import { diaEmBrasilia, labelStatus } from "@/lib/demandas";

type ItemMetrica = DemandasParaMetricas["itens"][number];

export type ResumoDemandas = {
  total: number;
  concluidas: number;
  aguardandoConfirmacao: number;
  pendentes: number;
  emAndamento: number;
  naoConcluidas: number;
  atrasadas: number;
  venceHoje: number;
  taxaConclusao: number;
};

export function calcularResumo(
  itens: ItemMetrica[],
  agora: Date = new Date()
): ResumoDemandas {
  const hoje = diaEmBrasilia(agora);
  let concluidas = 0;
  let aguardandoConfirmacao = 0;
  let pendentes = 0;
  let emAndamento = 0;
  let atrasadas = 0;
  let venceHoje = 0;

  for (const item of itens) {
    if (item.status === "concluida") concluidas += 1;
    if (item.status === "aguardando_confirmacao") aguardandoConfirmacao += 1;
    if (item.status === "pendente") pendentes += 1;
    if (item.status === "em_andamento") emAndamento += 1;
    if (item.atrasada) atrasadas += 1;
    if (
      item.status !== "concluida" &&
      diaEmBrasilia(item.prazo_final) === hoje
    ) {
      venceHoje += 1;
    }
  }

  const total = itens.length;

  return {
    total,
    concluidas,
    aguardandoConfirmacao,
    pendentes,
    emAndamento,
    naoConcluidas: pendentes + emAndamento + aguardandoConfirmacao,
    atrasadas,
    venceHoje,
    taxaConclusao: total > 0 ? Math.round((concluidas / total) * 100) : 0,
  };
}

export type DemandasPorFuncionario = {
  responsavelId: string | null;
  nome: string;
  total: number;
  pendentes: number;
  emAndamento: number;
  aguardandoConfirmacao: number;
  concluidas: number;
  atrasadas: number;
};

export function calcularPorFuncionario(
  itens: ItemMetrica[]
): DemandasPorFuncionario[] {
  const mapa = new Map<string, DemandasPorFuncionario>();

  for (const item of itens) {
    const chave = item.responsavel_id ?? "sem-responsavel";
    const atual =
      mapa.get(chave) ??
      ({
        responsavelId: item.responsavel_id ?? null,
        nome: item.responsavel_nome ?? "Sem responsável",
        total: 0,
        pendentes: 0,
        emAndamento: 0,
        aguardandoConfirmacao: 0,
        concluidas: 0,
        atrasadas: 0,
      } satisfies DemandasPorFuncionario);

    atual.total += 1;
    if (item.status === "pendente") atual.pendentes += 1;
    if (item.status === "em_andamento") atual.emAndamento += 1;
    if (item.status === "aguardando_confirmacao") {
      atual.aguardandoConfirmacao += 1;
    }
    if (item.status === "concluida") atual.concluidas += 1;
    if (item.atrasada) atual.atrasadas += 1;

    mapa.set(chave, atual);
  }

  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR")
  );
}

export type ContagemSimples = {
  chave: string;
  label: string;
  valor: number;
};

export function calcularPorStatus(itens: ItemMetrica[]): ContagemSimples[] {
  const resumo = calcularResumo(itens);
  const ordem: { chave: DemandaStatus | "atrasada"; valor: number }[] = [
    { chave: "pendente", valor: resumo.pendentes },
    { chave: "em_andamento", valor: resumo.emAndamento },
    {
      chave: "aguardando_confirmacao",
      valor: resumo.aguardandoConfirmacao,
    },
    { chave: "concluida", valor: resumo.concluidas },
    { chave: "atrasada", valor: resumo.atrasadas },
  ];

  return ordem.map((item) => ({
    chave: item.chave,
    label:
      item.chave === "atrasada" ? "Atrasadas" : labelStatus(item.chave),
    valor: item.valor,
  }));
}

export function calcularPorTipoServico(itens: ItemMetrica[]): ContagemSimples[] {
  const mapa = new Map<string, ContagemSimples>();

  for (const item of itens) {
    const chave = item.tipo_servico_id ?? "sem-tipo";
    const atual =
      mapa.get(chave) ??
      ({
        chave,
        label: item.tipo_servico_nome ?? "Sem tipo de serviço",
        valor: 0,
      } satisfies ContagemSimples);
    atual.valor += 1;
    mapa.set(chave, atual);
  }

  return [...mapa.values()].sort(
    (a, b) => b.valor - a.valor || a.label.localeCompare(b.label, "pt-BR")
  );
}

export type EvolucaoMensal = {
  mes: string;
  label: string;
  recebidas: number;
  concluidas: number;
};

/** Recebidas (created_at) x confirmadas pelo gestor (concluida_em). */
export function calcularEvolucaoMensal(
  itens: ItemMetrica[],
  opts: { meses?: number; agora?: Date } = {}
): EvolucaoMensal[] {
  const meses = opts.meses ?? 6;
  const agora = opts.agora ?? new Date();
  const mesAtual = diaEmBrasilia(agora).slice(0, 7);

  const chaves: string[] = [];
  const base = new Date(`${mesAtual}-01T03:00:00.000Z`);
  for (let i = meses - 1; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setUTCMonth(d.getUTCMonth() - i);
    chaves.push(diaEmBrasilia(d).slice(0, 7));
  }

  const mapa = new Map<string, EvolucaoMensal>(
    chaves.map((mes) => [
      mes,
      { mes, label: rotuloMes(mes), recebidas: 0, concluidas: 0 },
    ])
  );

  for (const item of itens) {
    const mesCriacao = diaEmBrasilia(item.created_at).slice(0, 7);
    const entradaCriacao = mapa.get(mesCriacao);
    if (entradaCriacao) entradaCriacao.recebidas += 1;

    if (item.concluida_em) {
      const mesConclusao = diaEmBrasilia(item.concluida_em).slice(0, 7);
      const entradaConclusao = mapa.get(mesConclusao);
      if (entradaConclusao) entradaConclusao.concluidas += 1;
    }
  }

  return chaves.map((mes) => mapa.get(mes)!);
}

function rotuloMes(mes: string): string {
  const d = new Date(`${mes}-01T03:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return mes;
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    month: "short",
    year: "2-digit",
  })
    .format(d)
    .replace(".", "");
}
