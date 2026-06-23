export type ViaCepNormalized = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type ViaCepRaw = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function lookupViaCep(
  cepDigits: string
): Promise<ViaCepNormalized | null> {
  const digits = cepDigits.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86_400 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as ViaCepRaw;
  if (data.erro) return null;

  return {
    cep: digits,
    logradouro: String(data.logradouro ?? "").trim(),
    complemento: String(data.complemento ?? "").trim(),
    bairro: String(data.bairro ?? "").trim(),
    cidade: String(data.localidade ?? "").trim(),
    estado: String(data.uf ?? "")
      .trim()
      .toUpperCase()
      .slice(0, 2),
  };
}
