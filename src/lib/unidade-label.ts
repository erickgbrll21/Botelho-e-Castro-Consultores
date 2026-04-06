/** Rótulo para Matriz/Filial nas telas (card, detalhe). */
export function labelTipoUnidadeExibicao(
  tipo: "Matriz" | "Filial" | null | undefined,
  identificacaoFilial: string | null | undefined
): string {
  if (!tipo) return "—";
  if (tipo === "Matriz") return "Matriz";
  const rotulo = identificacaoFilial?.trim();
  return rotulo && rotulo.length > 0 ? rotulo : "Filial";
}
