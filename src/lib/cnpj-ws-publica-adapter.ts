import {
  mapBrasilApiJsonToClienteFields,
  onlyDigits,
  type BrasilApiCnpjJson,
  type BrasilApiCnpjQsa,
  type BrasilApiCnpjRegime,
} from "@/lib/brasilapi-cnpj";

function parseCapitalSocial(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (v == null) return undefined;
  let s = String(v).trim();
  if (!s) return undefined;
  s = s.replace(/[^\d.,-]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? undefined : n;
}

function strOrNome(obj: unknown): string {
  if (typeof obj === "string") return obj.trim();
  if (obj && typeof obj === "object" && "nome" in obj) {
    return String((obj as { nome?: string }).nome ?? "").trim();
  }
  return "";
}

function matrizFilialHints(est: Record<string, unknown>): {
  identificador_matriz_filial?: number;
  descricao_identificador_matriz_filial?: string;
} {
  const t = est.tipo;
  if (t && typeof t === "object") {
    const id = (t as { id?: number }).id;
    const nome = String((t as { nome?: string }).nome ?? "").toUpperCase();
    if (id === 1 || nome.includes("MATRIZ")) {
      return {
        identificador_matriz_filial: 1,
        descricao_identificador_matriz_filial: "MATRIZ",
      };
    }
    if (id === 2 || nome.includes("FILIAL")) {
      return {
        identificador_matriz_filial: 2,
        descricao_identificador_matriz_filial: "FILIAL",
      };
    }
  }
  if (typeof t === "string") {
    const u = t.toUpperCase();
    if (u.includes("MATRIZ")) {
      return {
        identificador_matriz_filial: 1,
        descricao_identificador_matriz_filial: "MATRIZ",
      };
    }
    if (u.includes("FILIAL")) {
      return {
        identificador_matriz_filial: 2,
        descricao_identificador_matriz_filial: "FILIAL",
      };
    }
  }
  return {};
}

function regimesFromEst(
  est: Record<string, unknown>
): BrasilApiCnpjRegime[] | undefined {
  const raw = est.regimes_tributarios;
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: BrasilApiCnpjRegime[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const anoRaw = o.ano;
    const ano =
      typeof anoRaw === "number"
        ? anoRaw
        : parseInt(String(anoRaw ?? ""), 10) || 0;
    const forma = String(o.forma ?? o.forma_de_tributacao ?? "").trim();
    if (forma) {
      out.push({
        ano,
        forma_de_tributacao: forma.replace(/\s+/g, "_"),
      });
    }
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Converte o JSON de `GET https://publica.cnpj.ws/cnpj/{cnpj}` para o formato
 * usado por `mapBrasilApiJsonToClienteFields`.
 */
export function cnpjWsPublicaToBrasilApiJson(
  payload: unknown
): BrasilApiCnpjJson | null {
  const root = payload as Record<string, unknown>;
  const est = root.estabelecimento as Record<string, unknown> | undefined;
  if (!est) return null;

  const cnpjDigits = onlyDigits(String(est.cnpj ?? root.cnpj ?? "")).slice(0, 14);
  if (cnpjDigits.length !== 14) return null;

  const rs =
    typeof root.razao_social === "string" ? root.razao_social.trim() : "";
  const municipio = strOrNome(est.cidade);
  const ufRaw = est.estado;
  let uf = "";
  if (typeof ufRaw === "string") uf = ufRaw.slice(0, 2).toUpperCase();
  else if (ufRaw && typeof ufRaw === "object" && "sigla" in ufRaw) {
    uf = String((ufRaw as { sigla?: string }).sigla ?? "")
      .slice(0, 2)
      .toUpperCase();
  }

  const descTipoLog = strOrNome(est.tipo_logradouro);

  const mf = matrizFilialHints(est);

  const ativ = est.atividade_principal as Record<string, unknown> | undefined;
  const cnaeDesc =
    typeof ativ?.descricao === "string" ? ativ.descricao : undefined;

  const ddd = onlyDigits(String(est.ddd1 ?? ""));
  const tel = onlyDigits(String(est.telefone1 ?? ""));
  const ddd2 = onlyDigits(String(est.ddd2 ?? ""));
  const tel2 = onlyDigits(String(est.telefone2 ?? ""));
  const phone1 =
    ddd.length >= 2 && tel.length >= 8 ? `${ddd}${tel}` : "";
  const phone2 =
    ddd2.length >= 2 && tel2.length >= 8 ? `${ddd2}${tel2}` : "";

  const qsa: BrasilApiCnpjQsa[] = [];
  const sociosRaw = root.socios;
  if (Array.isArray(sociosRaw)) {
    for (const s of sociosRaw) {
      if (!s || typeof s !== "object") continue;
      const rec = s as Record<string, unknown>;
      const nome = String(rec.nome ?? rec.razao_social ?? "").trim();
      const doc = onlyDigits(
        String(rec.cpf_cnpj ?? rec.cnpj_cpf_do_socio ?? "")
      );
      if (nome) qsa.push({ nome_socio: nome, cnpj_cpf_do_socio: doc });
    }
  }

  return {
    cnpj: cnpjDigits,
    razao_social: rs || undefined,
    nome_fantasia:
      typeof est.nome_fantasia === "string"
        ? est.nome_fantasia.trim()
        : undefined,
    cep: String(est.cep ?? ""),
    logradouro: String(est.logradouro ?? ""),
    numero: String(est.numero ?? ""),
    complemento: String(est.complemento ?? ""),
    bairro: String(est.bairro ?? ""),
    municipio: municipio || undefined,
    uf: uf || undefined,
    descricao_tipo_de_logradouro: descTipoLog || undefined,
    capital_social: parseCapitalSocial(root.capital_social),
    data_inicio_atividade:
      typeof est.data_inicio_atividade === "string"
        ? est.data_inicio_atividade.trim().slice(0, 10)
        : undefined,
    cnae_fiscal_descricao: cnaeDesc,
    identificador_matriz_filial: mf.identificador_matriz_filial,
    descricao_identificador_matriz_filial:
      mf.descricao_identificador_matriz_filial,
    ddd_telefone_1: phone1 || undefined,
    ddd_telefone_2: phone2 || undefined,
    regime_tributario: regimesFromEst(est),
    qsa: qsa.length > 0 ? qsa : undefined,
  };
}

export function mapPublicaCnpjWsPayloadToClienteFields(
  payload: unknown
): Record<string, unknown> | null {
  const shaped = cnpjWsPublicaToBrasilApiJson(payload);
  if (!shaped) return null;
  const patch = mapBrasilApiJsonToClienteFields(shaped);
  return Object.keys(patch).length > 0 ? patch : null;
}
