/**
 * Mensagens legíveis para erros comuns do PostgREST/Postgres em ações de formulário.
 */
export function messageFromSupabaseError(
  error: { code?: string; message?: string } | null | undefined,
  fallback: string
): string {
  if (!error?.message) {
    return fallback;
  }

  const { code, message } = error;
  const isUniqueViolation =
    code === "23505" ||
    /duplicate key|unique constraint/i.test(message);

  if (isUniqueViolation) {
    if (/cnpj/i.test(message)) {
      return "Já existe um cliente cadastrado com este CNPJ. Use a busca na lista ou abra o cadastro existente para editar.";
    }
    return "Não foi possível salvar: já existe outro registro com o mesmo identificador único.";
  }

  return message || fallback;
}
