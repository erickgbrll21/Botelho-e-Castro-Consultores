export type SituacaoEmpresa = "ativa" | "paralisada" | "desativada";

export function getSituacaoEmpresa(cliente: {
  situacao_empresa?: string | null;
  ativo?: boolean | null;
}): SituacaoEmpresa {
  const raw = cliente.situacao_empresa?.trim().toLowerCase();
  if (raw === "paralisada" || raw === "desativada" || raw === "ativa") {
    return raw;
  }
  return cliente.ativo === false ? "desativada" : "ativa";
}

export function situacaoEmpresaLabels(s: SituacaoEmpresa): {
  titulo: string;
  descricaoCurta: string;
} {
  switch (s) {
    case "paralisada":
      return { titulo: "Empresa paralisada", descricaoCurta: "Paralisada" };
    case "desativada":
      return { titulo: "Empresa desativada", descricaoCurta: "Desativada" };
    default:
      return { titulo: "Empresa ativa", descricaoCurta: "Ativa" };
  }
}

/** Cor do indicador (lista, cabeçalho) */
export function situacaoIndicatorClass(s: SituacaoEmpresa): string {
  switch (s) {
    case "paralisada":
      return "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.65)]";
    case "desativada":
      return "bg-red-500";
    default:
      return "bg-emerald-500";
  }
}

export function situacaoPillProps(s: SituacaoEmpresa): {
  label: string;
  tone: "success" | "warning" | "critical";
} {
  switch (s) {
    case "paralisada":
      return { label: "Paralisada", tone: "warning" };
    case "desativada":
      return { label: "Desativada", tone: "critical" };
    default:
      return { label: "Ativa", tone: "success" };
  }
}
