/**
 * API pública DataJud (CNJ) — metadados de processos.
 * @see https://datajud-wiki.cnj.jus.br/api-publica/
 *
 * Chave pública: pode ser sobrescrita por DATAJUD_API_KEY; o CNJ pode alterá-la.
 */

export const DATAJUD_BASE = "https://api-publica.datajud.cnj.jus.br";

/** Chave pública divulgada na wiki (fallback). */
export const DATAJUD_WIKI_PUBLIC_KEY =
  "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

/** Alias do índice (segmento da URL antes de /_search). */
export type DatajudTribunalAlias = `api_publica_${string}`;

export type DatajudTribunalOption = {
  alias: DatajudTribunalAlias;
  label: string;
  group: string;
};

const TR_ESTADUAL: Record<string, DatajudTribunalAlias> = {
  "01": "api_publica_tjac",
  "02": "api_publica_tjal",
  "03": "api_publica_tjam",
  "04": "api_publica_tjap",
  "05": "api_publica_tjba",
  "06": "api_publica_tjce",
  "07": "api_publica_tjdft",
  "08": "api_publica_tjes",
  "09": "api_publica_tjgo",
  "10": "api_publica_tjma",
  "11": "api_publica_tjmg",
  "12": "api_publica_tjms",
  "13": "api_publica_tjmt",
  "14": "api_publica_tjpa",
  "15": "api_publica_tjpb",
  "16": "api_publica_tjpe",
  "17": "api_publica_tjpi",
  "18": "api_publica_tjpr",
  "19": "api_publica_tjrj",
  "20": "api_publica_tjrn",
  "21": "api_publica_tjro",
  "22": "api_publica_tjrr",
  "23": "api_publica_tjrs",
  "24": "api_publica_tjsc",
  "25": "api_publica_tjse",
  "26": "api_publica_tjsp",
  "27": "api_publica_tjto",
};

const TR_ELEITORAL: Record<string, DatajudTribunalAlias> = {
  "01": "api_publica_tre-ac",
  "02": "api_publica_tre-al",
  "03": "api_publica_tre-am",
  "04": "api_publica_tre-ap",
  "05": "api_publica_tre-ba",
  "06": "api_publica_tre-ce",
  "07": "api_publica_tre-dft",
  "08": "api_publica_tre-es",
  "09": "api_publica_tre-go",
  "10": "api_publica_tre-ma",
  "11": "api_publica_tre-mg",
  "12": "api_publica_tre-ms",
  "13": "api_publica_tre-mt",
  "14": "api_publica_tre-pa",
  "15": "api_publica_tre-pb",
  "16": "api_publica_tre-pe",
  "17": "api_publica_tre-pi",
  "18": "api_publica_tre-pr",
  "19": "api_publica_tre-rj",
  "20": "api_publica_tre-rn",
  "21": "api_publica_tre-ro",
  "22": "api_publica_tre-rr",
  "23": "api_publica_tre-rs",
  "24": "api_publica_tre-sc",
  "25": "api_publica_tre-se",
  "26": "api_publica_tre-sp",
  "27": "api_publica_tre-to",
};

/** Lista para o seletor da UI (ordem estável por grupo). */
export const DATAJUD_TRIBUNAL_OPTIONS: DatajudTribunalOption[] = [
  { group: "Superiores", alias: "api_publica_stj", label: "STJ" },
  { group: "Superiores", alias: "api_publica_tst", label: "TST" },
  { group: "Superiores", alias: "api_publica_tse", label: "TSE" },
  { group: "Superiores", alias: "api_publica_stm", label: "STM" },
  { group: "Justiça Federal", alias: "api_publica_trf1", label: "TRF 1ª Região" },
  { group: "Justiça Federal", alias: "api_publica_trf2", label: "TRF 2ª Região" },
  { group: "Justiça Federal", alias: "api_publica_trf3", label: "TRF 3ª Região" },
  { group: "Justiça Federal", alias: "api_publica_trf4", label: "TRF 4ª Região" },
  { group: "Justiça Federal", alias: "api_publica_trf5", label: "TRF 5ª Região" },
  { group: "Justiça Federal", alias: "api_publica_trf6", label: "TRF 6ª Região" },
  ...Object.values(TR_ESTADUAL).map((alias) => ({
    group: "Justiça Estadual / DF",
    alias,
    label: alias.replace("api_publica_", "").toUpperCase(),
  })),
  ...Array.from({ length: 24 }, (_, i) => {
    const n = i + 1;
    return {
      group: "Justiça do Trabalho",
      alias: `api_publica_trt${n}` as DatajudTribunalAlias,
      label: `TRT ${n}ª Região`,
    };
  }),
  ...Object.values(TR_ELEITORAL).map((alias) => ({
    group: "Justiça Eleitoral",
    alias,
    label: alias.replace("api_publica_", "").toUpperCase(),
  })),
  { group: "Justiça Militar estadual", alias: "api_publica_tjmmg", label: "TJMMG" },
  { group: "Justiça Militar estadual", alias: "api_publica_tjmrs", label: "TJMRS" },
  { group: "Justiça Militar estadual", alias: "api_publica_tjmsp", label: "TJMSP" },
];

export function normalizeNumeroProcessoCnj(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Infere o índice DataJud a partir dos 20 dígitos da numeração única (sem formatação).
 * J e TR conforme FAQ do CNJ (Resolução 65/2008).
 */
export function inferDatajudAliasFromCnj20(digits: string): DatajudTribunalAlias | null {
  if (digits.length !== 20) return null;
  const J = digits[13];
  const TR = digits.slice(14, 16);

  if (J === "1" || J === "2") return null;

  if (J === "3" && TR === "00") return "api_publica_stj";
  if (J === "5" && TR === "00") return "api_publica_tst";
  if (J === "6" && TR === "00") return "api_publica_tse";
  if (J === "7" && TR === "00") return "api_publica_stm";

  if (J === "4") {
    const n = parseInt(TR, 10);
    if (n >= 1 && n <= 6) return `api_publica_trf${n}` as DatajudTribunalAlias;
    return null;
  }

  if (J === "5") {
    const n = parseInt(TR, 10);
    if (n >= 1 && n <= 24) return `api_publica_trt${n}` as DatajudTribunalAlias;
    return null;
  }

  if (J === "6") {
    return TR_ELEITORAL[TR] ?? null;
  }

  if (J === "8") {
    return TR_ESTADUAL[TR] ?? null;
  }

  if (J === "9") {
    return null;
  }

  return null;
}

export function buildDatajudSearchUrl(alias: DatajudTribunalAlias): string {
  return `${DATAJUD_BASE}/${alias}/_search`;
}

export function getDatajudAuthHeader(apiKey: string): Record<string, string> {
  return {
    Authorization: `APIKey ${apiKey.trim()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Corpo de busca por número (campo numeroProcesso sem formatação, glossário DataJud). */
export function buildNumeroProcessoQuery(numero20: string, size = 25) {
  return {
    query: {
      match: {
        numeroProcesso: numero20,
      },
    },
    size,
  };
}
