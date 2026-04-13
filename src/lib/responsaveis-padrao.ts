/** Responsáveis padrão do escritório quando o campo não é preenchido no formulário. */
export const RESPONSAVEL_PADRAO_FINANCEIRO =
  "Maria de Fátima da Silva Furtado";
export const RESPONSAVEL_PADRAO_DP = "Aline Ferreira Santos";
export const RESPONSAVEL_PADRAO_CONTABIL = "Waldir Marcio Valladares";

export const RESPONSAVEL_PADRAO_JURIDICO_CIVEL =
  "Yuri Araujo Primo Videira";
export const RESPONSAVEL_PADRAO_JURIDICO_TRABALHISTA =
  "Renan Barros de Carvalho";

/**
 * Valor gravado em `responsaveis_internos.responsavel_juridico`:
 * usa o texto do formulário se preenchido; senão, nomes padrão por serviço
 * (Cível e/ou Trabalhista), um por linha quando forem ambos.
 */
export function responsavelJuridicoSalvo(
  manual: string,
  juridico_civel: boolean,
  juridico_trabalhista: boolean
): string | null {
  const t = manual.trim();
  if (t) return t;
  const partes: string[] = [];
  if (juridico_civel) {
    partes.push(`Cível: ${RESPONSAVEL_PADRAO_JURIDICO_CIVEL}`);
  }
  if (juridico_trabalhista) {
    partes.push(`Trabalhista: ${RESPONSAVEL_PADRAO_JURIDICO_TRABALHISTA}`);
  }
  return partes.length ? partes.join("\n") : null;
}

/** Texto derivado só dos serviços (sem valor manual no banco). */
export function responsavelJuridicoDerivadoDosServicos(
  juridico_civel: boolean,
  juridico_trabalhista: boolean
): string {
  return responsavelJuridicoSalvo("", juridico_civel, juridico_trabalhista) ?? "";
}

type ServicosJuridicoFlags = {
  juridico_civel?: boolean | null;
  juridico_trabalhista?: boolean | null;
} | null | undefined;

/** Ficha do cliente: usa o que está gravado ou calcula a partir de Cível/Trabalhista. */
export function responsavelJuridicoParaExibicao(
  armazenado: string | null | undefined,
  servicos: ServicosJuridicoFlags
): string {
  const t = (armazenado ?? "").trim();
  if (t) return t;
  const derivado = responsavelJuridicoDerivadoDosServicos(
    Boolean(servicos?.juridico_civel),
    Boolean(servicos?.juridico_trabalhista)
  );
  return derivado || "—";
}

/** Formulário de edição: pré-preenche quando o banco está vazio mas os serviços pedem padrão. */
export function responsavelJuridicoCampoDefault(
  armazenado: string | null | undefined,
  servicos: ServicosJuridicoFlags
): string {
  const t = (armazenado ?? "").trim();
  if (t) return t;
  return responsavelJuridicoDerivadoDosServicos(
    Boolean(servicos?.juridico_civel),
    Boolean(servicos?.juridico_trabalhista)
  );
}
