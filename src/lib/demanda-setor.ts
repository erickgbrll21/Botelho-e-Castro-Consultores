/** Setores do Controle de Demandas. Cada um é um módulo isolado. */
export const DEMANDA_SETORES = ["civel", "legalizacao"] as const;

export type DemandaSetor = (typeof DEMANDA_SETORES)[number];

export const SETOR_META: Record<
  DemandaSetor,
  {
    area: string;
    departamento: string;
    titulo: string;
    descricao: string;
  }
> = {
  civel: {
    area: "Jurídico",
    departamento: "Cível",
    titulo: "Demandas · Cível",
    descricao: "Controle de demandas do departamento jurídico, exclusivo do Cível.",
  },
  legalizacao: {
    area: "Contábil",
    departamento: "Legalização",
    titulo: "Demandas · Legalização",
    descricao:
      "Controle de demandas do setor contábil, exclusivo de Legalização.",
  },
};

export function isDemandaSetor(valor: string): valor is DemandaSetor {
  return (DEMANDA_SETORES as readonly string[]).includes(valor);
}

export function parseSetorForm(raw: unknown): DemandaSetor {
  const valor = String(raw ?? "").trim();
  if (!isDemandaSetor(valor)) {
    throw new Error("Setor da demanda inválido.");
  }
  return valor;
}

export function caminhosSetor(setor: DemandaSetor) {
  const base = `/demandas/${setor}`;
  return {
    base,
    todas: `${base}/todas`,
    minhas: `${base}/minhas`,
    tipos: `${base}/tipos-servico`,
  };
}
