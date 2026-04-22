/**
 * Complemento via https://publica.cnpj.ws — costuma trazer inscrição estadual
 * (e, quando existir na resposta, municipal).
 */

type CnpjWsEstado = { sigla?: string };
type CnpjWsItemIe = {
  inscricao_estadual?: string;
  ativo?: boolean;
  estado?: CnpjWsEstado;
};
type CnpjWsItemIm = {
  inscricao_municipal?: string;
  numero?: string;
};

function setFormField(form: HTMLFormElement, name: string, value: string) {
  const el = form.elements.namedItem(name);
  if (!el || el instanceof RadioNodeList) return;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = value;
  }
}

function pickMunicipal(est: Record<string, unknown>): string {
  const direct =
    est.inscricao_municipal ??
    est.inscricao_municipal_numero ??
    est.numero_inscricao_municipal;
  if (direct != null && String(direct).trim()) {
    return String(direct).trim();
  }
  const arr = est.inscricoes_municipais as CnpjWsItemIm[] | undefined;
  if (Array.isArray(arr) && arr.length > 0) {
    const v =
      arr[0].inscricao_municipal ??
      arr[0].numero;
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

/**
 * Aplica IE/IM a partir do JSON de publica.cnpj.ws/cnpj/{cnpj}
 */
export function applyCnpjWsInscricoesToForm(
  form: HTMLFormElement,
  payload: unknown
) {
  const root = payload as Record<string, unknown>;
  const est = root.estabelecimento as Record<string, unknown> | undefined;
  if (!est) return;

  const ufForm = (
    (form.elements.namedItem("estado") as HTMLInputElement | null)?.value ?? ""
  )
    .trim()
    .toUpperCase();

  const lista = est.inscricoes_estaduais as CnpjWsItemIe[] | undefined;
  if (Array.isArray(lista) && lista.length > 0) {
    const ufMatch = ufForm
      ? lista.find(
          (x) =>
            x.ativo !== false &&
            String(x.estado?.sigla ?? "")
              .trim()
              .toUpperCase() === ufForm
        )
      : undefined;
    const chosen =
      ufMatch ||
      lista.find((x) => x.ativo !== false) ||
      lista[0];
    const ie = chosen?.inscricao_estadual;
    if (ie != null && String(ie).trim()) {
      setFormField(form, "inscricao_estadual", String(ie).trim());
    }
  }

  const im = pickMunicipal(est);
  if (im) {
    setFormField(form, "inscricao_municipal", im);
  }
}

export async function fetchAndApplyInscricoesCnpjWs(
  form: HTMLFormElement,
  cnpjDigits14: string
): Promise<void> {
  if (cnpjDigits14.length !== 14) return;
  try {
    const res = await fetch(`/api/cnpj/ws?cnpj=${encodeURIComponent(cnpjDigits14)}`);
    if (!res.ok) return;
    const data: unknown = await res.json();
    const root = data as Record<string, unknown>;
    const ie = root.inscricao_estadual;
    const im = root.inscricao_municipal;
    if (typeof ie === "string" && ie.trim()) {
      setFormField(form, "inscricao_estadual", ie.trim());
    }
    if (typeof im === "string" && im.trim()) {
      setFormField(form, "inscricao_municipal", im.trim());
    }
  } catch {
    // rede / CORS em teoria não ocorre no browser para esse host
  }
}

/** Para uso no servidor: IE/IM a partir do JSON de publica.cnpj.ws/cnpj/{cnpj} */
export function extractInscricoesFromCnpjWsPayload(
  payload: unknown,
  ufForm: string
): { inscricao_estadual: string | null; inscricao_municipal: string | null } {
  const root = payload as Record<string, unknown>;
  const est = root.estabelecimento as Record<string, unknown> | undefined;
  if (!est) {
    return { inscricao_estadual: null, inscricao_municipal: null };
  }

  const ufNorm = ufForm.trim().toUpperCase();
  let ie: string | null = null;

  const lista = est.inscricoes_estaduais as CnpjWsItemIe[] | undefined;
  if (Array.isArray(lista) && lista.length > 0) {
    const ufMatch = ufNorm
      ? lista.find(
          (x) =>
            x.ativo !== false &&
            String(x.estado?.sigla ?? "")
              .trim()
              .toUpperCase() === ufNorm
        )
      : undefined;
    const chosen =
      ufMatch ||
      lista.find((x) => x.ativo !== false) ||
      lista[0];
    const raw = chosen?.inscricao_estadual;
    if (raw != null && String(raw).trim()) {
      ie = String(raw).trim();
    }
  }

  const imRaw = pickMunicipal(est);
  const im = imRaw ? imRaw.trim() : null;

  return {
    inscricao_estadual: ie,
    inscricao_municipal: im && im.length > 0 ? im : null,
  };
}
