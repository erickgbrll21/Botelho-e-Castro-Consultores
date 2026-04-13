const MAX_KEYS_POR_LINHA = 80;
const MAX_NOME_CHAVE = 100;
const MAX_STRING_CAMPO = 800;
const MAX_RAZAO_SOCIAL = 500;

export type ImportValidationError = { status: 400; message: string };

/** Valida corpo bruto antes do processamento pesado. */
export function validateImportClientsPayload(
  clients: unknown
): ImportValidationError | null {
  if (!Array.isArray(clients)) {
    return { status: 400, message: "Formato inválido: esperado array 'clients'." };
  }
  if (clients.length === 0) {
    return { status: 400, message: "Nenhum dado encontrado na planilha." };
  }

  for (let i = 0; i < clients.length; i++) {
    const row = clients[i];
    if (row === null || typeof row !== "object" || Array.isArray(row)) {
      return {
        status: 400,
        message: `Linha ${i + 1}: cada registro deve ser um objeto (linha da planilha).`,
      };
    }
    const rec = row as Record<string, unknown>;
    const keys = Object.keys(rec);
    if (keys.length > MAX_KEYS_POR_LINHA) {
      return {
        status: 400,
        message: `Linha ${i + 1}: excesso de colunas (máx. ${MAX_KEYS_POR_LINHA}).`,
      };
    }
    for (const k of keys) {
      if (k.length > MAX_NOME_CHAVE) {
        return {
          status: 400,
          message: `Linha ${i + 1}: nome de coluna inválido ou longo demais.`,
        };
      }
      const v = rec[k];
      if (v === null || v === undefined) continue;
      const t = typeof v;
      if (t === "string") {
        if ((v as string).length > MAX_STRING_CAMPO) {
          return {
            status: 400,
            message: `Linha ${i + 1}: valor muito longo no campo "${k.slice(0, 40)}…".`,
          };
        }
      } else if (t === "number" || t === "boolean") {
        continue;
      } else if (Array.isArray(v)) {
        return {
          status: 400,
          message: `Linha ${i + 1}: arrays não são permitidos como valor de coluna.`,
        };
      } else if (t === "object") {
        return {
          status: 400,
          message: `Linha ${i + 1}: objetos aninhados não são permitidos.`,
        };
      } else {
        return {
          status: 400,
          message: `Linha ${i + 1}: tipo de dado não suportado.`,
        };
      }
    }
  }

  return null;
}

/** Regras por linha já mapeada (após getValue). */
export function validateMappedClienteLinha(
  razao_social: string,
  cnpj: string,
  linha: number
): ImportValidationError | null {
  if (razao_social.length > MAX_RAZAO_SOCIAL) {
    return {
      status: 400,
      message: `Linha ${linha}: razão social excede ${MAX_RAZAO_SOCIAL} caracteres.`,
    };
  }
  if (cnpj !== "0" && cnpj.length !== 14) {
    return {
      status: 400,
      message: `Linha ${linha}: CNPJ deve ter 14 dígitos ou ficar vazio conforme modelo.`,
    };
  }
  return null;
}
