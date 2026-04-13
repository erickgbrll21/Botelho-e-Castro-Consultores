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
