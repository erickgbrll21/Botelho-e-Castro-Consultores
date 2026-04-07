/** Resposta parcial da API pública https://brasilapi.com.br/api/cnpj/v1/{cnpj} */

export type BrasilApiCnpjQsa = {
  nome_socio?: string;
  cnpj_cpf_do_socio?: string;
  qualificacao_socio?: string;
};

export type BrasilApiCnpjRegime = {
  ano?: number;
  forma_de_tributacao?: string;
};

export type BrasilApiCnpjJson = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  /** Quando a BrasilAPI passar a expor (ou espelhos da base). */
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  descricao_tipo_de_logradouro?: string;
  capital_social?: number;
  data_inicio_atividade?: string;
  cnae_fiscal_descricao?: string;
  identificador_matriz_filial?: number;
  descricao_identificador_matriz_filial?: string;
  descricao_situacao_cadastral?: string;
  ddd_telefone_1?: string;
  ddd_telefone_2?: string;
  regime_tributario?: BrasilApiCnpjRegime[];
  qsa?: BrasilApiCnpjQsa[];
};

export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

export function formatCnpjDisplay(digits: string) {
  const d = onlyDigits(digits).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

function formatCepDisplay(cep: string) {
  const d = onlyDigits(cep).slice(0, 8);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}

function formatPhoneBr(raw: string | undefined) {
  if (!raw) return "";
  const d = onlyDigits(raw);
  if (d.length < 10) return raw;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 8)
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  if (rest.length === 9)
    return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
  return raw;
}

function buildLogradouro(data: BrasilApiCnpjJson) {
  const tipo = (data.descricao_tipo_de_logradouro || "").trim();
  const log = (data.logradouro || "").trim();
  const num = (data.numero || "").trim();
  const base = [tipo, log].filter(Boolean).join(" ").trim();
  if (num && base) return `${base}, ${num}`;
  if (num) return num;
  return base;
}

function atividadeFromCnae(desc: string | undefined): string {
  if (!desc) return "";
  const d = desc.toLowerCase();
  const serv =
    /serviço|servico|desenvolvimento|consultoria|informática|informatica|software|hospedagem|publicidade|provedor|dados/.test(
      d
    );
  const com =
    /comércio|comercio|varejista|varejo/.test(d);
  const ind =
    /indústria|industria|fabricação|fabricacao/.test(d);
  if (serv && com) return "Ambos";
  if (com) return "Comércio";
  if (ind) return "Indústria";
  if (serv) return "Serviço";
  return "";
}

function tipoUnidadeFromApi(data: BrasilApiCnpjJson): string {
  const id = data.identificador_matriz_filial;
  if (id === 1) return "Matriz";
  if (id === 2) return "Filial";
  const desc = (data.descricao_identificador_matriz_filial || "").toUpperCase();
  if (desc.includes("MATRIZ")) return "Matriz";
  if (desc.includes("FILIAL")) return "Filial";
  return "";
}

function latestRegime(regimes: BrasilApiCnpjRegime[] | undefined): string {
  if (!regimes?.length) return "";
  const sorted = [...regimes].sort(
    (a, b) => (b.ano ?? 0) - (a.ano ?? 0)
  );
  return sorted[0]?.forma_de_tributacao?.replace(/_/g, " ") ?? "";
}

function setInputValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!el || el instanceof RadioNodeList) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
  }
}

function setSelectValue(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!el || el instanceof RadioNodeList) return;
  if (el instanceof HTMLSelectElement) {
    const opt = Array.from(el.options).find((o) => o.value === value);
    if (opt) el.value = value;
  }
}

/**
 * Preenche campos do formulário de cliente com dados da BrasilAPI (Receita).
 */
export function applyCnpjJsonToForm(form: HTMLFormElement, data: BrasilApiCnpjJson) {
  setInputValue(form, "razao_social", data.razao_social ?? "");
  if (data.cnpj) {
    setInputValue(form, "cnpj", formatCnpjDisplay(data.cnpj));
  }
  setInputValue(form, "cep", formatCepDisplay(data.cep ?? ""));
  setInputValue(form, "logradouro", buildLogradouro(data));
  setInputValue(form, "bairro", data.bairro ?? "");
  setInputValue(form, "complemento", data.complemento ?? "");
  setInputValue(
    form,
    "cidade",
    data.municipio
      ? data.municipio
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : ""
  );
  setInputValue(form, "estado", (data.uf ?? "").slice(0, 2).toUpperCase());

  const tipo = tipoUnidadeFromApi(data);
  if (tipo) setSelectValue(form, "tipo_unidade", tipo);

  const ativ = atividadeFromCnae(data.cnae_fiscal_descricao);
  if (ativ) setSelectValue(form, "atividade", ativ);

  setSelectValue(form, "constituicao", "Sim");

  if (typeof data.capital_social === "number" && !Number.isNaN(data.capital_social)) {
    setInputValue(form, "capital_social", String(data.capital_social));
  }

  if (data.data_inicio_atividade) {
    setInputValue(form, "data_abertura_cliente", data.data_inicio_atividade);
  }

  setInputValue(form, "regime_tributario", latestRegime(data.regime_tributario));

  const tel =
    formatPhoneBr(data.ddd_telefone_1) ||
    formatPhoneBr(data.ddd_telefone_2);
  if (tel) setInputValue(form, "contato_telefone", tel);

  const fantasia = (data.nome_fantasia ?? "").trim();
  if (fantasia) setInputValue(form, "contato_nome", fantasia);

  const socios = data.qsa ?? [];
  if (socios[0]?.nome_socio) {
    setInputValue(form, "socio_nome", socios[0].nome_socio);
  }

  const pjSocio = socios.find(
    (s) => onlyDigits(s.cnpj_cpf_do_socio ?? "").length === 14
  );
  if (pjSocio?.nome_socio) {
    setInputValue(form, "socio_responsavel_pj", pjSocio.nome_socio);
  }

  const ext = data as Record<string, unknown>;
  const str = (k: string) => {
    const v = ext[k];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const ieVal =
    data.inscricao_estadual?.trim() ||
    str("inscricao_estadual") ||
    str("inscrição_estadual") ||
    str("numero_inscricao_estadual") ||
    str("ie");
  if (ieVal) setInputValue(form, "inscricao_estadual", ieVal);

  const imVal =
    data.inscricao_municipal?.trim() ||
    str("inscricao_municipal") ||
    str("inscrição_municipal") ||
    str("numero_inscricao_municipal") ||
    str("im");
  if (imVal) setInputValue(form, "inscricao_municipal", imVal);
}

/**
 * Campos da tabela `clientes` a partir do JSON da BrasilAPI (atualização em lote).
 * Não inclui domínio, grupo, valores de contrato ou situação operacional.
 */
export function mapBrasilApiJsonToClienteFields(
  data: BrasilApiCnpjJson
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};

  if (data.razao_social?.trim()) {
    patch.razao_social = data.razao_social.trim();
  }

  const cepDigits = onlyDigits(data.cep ?? "").slice(0, 8);
  if (cepDigits.length === 8) {
    patch.cep = cepDigits;
  }

  const log = buildLogradouro(data);
  if (log) patch.logradouro = log;

  if (data.bairro?.trim()) patch.bairro = data.bairro.trim();
  if (data.complemento?.trim()) patch.complemento = data.complemento.trim();

  if (data.municipio?.trim()) {
    patch.cidade = data.municipio
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const uf = (data.uf ?? "").slice(0, 2).toUpperCase();
  if (uf.length === 2) patch.estado = uf;

  const tipo = tipoUnidadeFromApi(data);
  if (tipo === "Matriz" || tipo === "Filial") {
    patch.tipo_unidade = tipo;
    if (tipo === "Matriz") {
      patch.identificacao_filial = null;
    }
  }

  const ativ = atividadeFromCnae(data.cnae_fiscal_descricao);
  if (ativ) patch.atividade = ativ;

  patch.constituicao = true;

  if (
    typeof data.capital_social === "number" &&
    !Number.isNaN(data.capital_social)
  ) {
    patch.capital_social = data.capital_social;
  }

  if (data.data_inicio_atividade) {
    patch.data_abertura_cliente = data.data_inicio_atividade;
  }

  const regime = latestRegime(data.regime_tributario);
  if (regime) patch.regime_tributario = regime;

  const tel =
    formatPhoneBr(data.ddd_telefone_1) ||
    formatPhoneBr(data.ddd_telefone_2);
  if (tel) patch.contato_telefone = tel;

  const fantasia = (data.nome_fantasia ?? "").trim();
  if (fantasia) patch.contato_nome = fantasia;

  const socios = data.qsa ?? [];
  const pjSocio = socios.find(
    (s) => onlyDigits(s.cnpj_cpf_do_socio ?? "").length === 14
  );
  if (pjSocio?.nome_socio?.trim()) {
    patch.socio_responsavel_pj = pjSocio.nome_socio.trim();
  }

  const ext = data as Record<string, unknown>;
  const str = (k: string) => {
    const v = ext[k];
    return typeof v === "string" && v.trim() ? v.trim() : "";
  };
  const ieVal =
    data.inscricao_estadual?.trim() ||
    str("inscricao_estadual") ||
    str("inscrição_estadual") ||
    str("numero_inscricao_estadual") ||
    str("ie");
  if (ieVal) patch.inscricao_estadual = ieVal;

  const imVal =
    data.inscricao_municipal?.trim() ||
    str("inscricao_municipal") ||
    str("inscrição_municipal") ||
    str("numero_inscricao_municipal") ||
    str("im");
  if (imVal) patch.inscricao_municipal = imVal;

  return patch;
}

/** Logradouro com número (consulta / exibição fora de formulário). */
export function brasilApiLogradouroLinha(data: BrasilApiCnpjJson): string {
  return buildLogradouro(data);
}

export function brasilApiTelefonePreferido(data: BrasilApiCnpjJson): string {
  const t =
    formatPhoneBr(data.ddd_telefone_1) ||
    formatPhoneBr(data.ddd_telefone_2);
  return t;
}

export function brasilApiRegimeAtualTexto(data: BrasilApiCnpjJson): string {
  return latestRegime(data.regime_tributario);
}

export function brasilApiTipoUnidadeTexto(data: BrasilApiCnpjJson): string {
  return tipoUnidadeFromApi(data);
}
