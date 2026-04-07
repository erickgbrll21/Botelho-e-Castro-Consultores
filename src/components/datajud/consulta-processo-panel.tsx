"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DATAJUD_TRIBUNAL_OPTIONS } from "@/lib/datajud";

type Status = "idle" | "loading" | "ok" | "error";

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function formatCnjMask(digits: string): string {
  const d = onlyDigits(digits).slice(0, 20);
  const p: string[] = [];
  if (d.length > 0) p.push(d.slice(0, Math.min(7, d.length)));
  if (d.length > 7) p.push(d.slice(7, Math.min(9, d.length)));
  if (d.length > 9) p.push(d.slice(9, Math.min(13, d.length)));
  if (d.length > 13) p.push(d.slice(13, Math.min(14, d.length)));
  if (d.length > 14) p.push(d.slice(14, Math.min(16, d.length)));
  if (d.length > 16) p.push(d.slice(16, 20));
  if (p.length <= 1) return p[0] ?? "";
  return `${p[0]}-${p[1]}.${p[2]}.${p[3]}.${p[4]}.${p[5]}`;
}

type HitSource = Record<string, unknown>;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function pickStr(obj: unknown, key: string): string | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function pickNestedNome(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  const nome = obj.nome;
  return typeof nome === "string" ? nome : undefined;
}

function pickNum(obj: unknown, key: string): number | undefined {
  if (!isRecord(obj)) return undefined;
  const v = obj[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function formatNumeroCnjExibicao(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const d = onlyDigits(raw);
  return d.length === 20 ? formatCnjMask(d) : raw;
}

function DetalheLinha({
  rotulo,
  valor,
}: {
  rotulo: string;
  valor: ReactNode;
}) {
  if (valor === null || valor === undefined || valor === "") return null;
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-baseline sm:gap-x-3">
      <dt className="text-neutral-500">{rotulo}</dt>
      <dd className="min-w-0 text-neutral-100">{valor}</dd>
    </div>
  );
}

export function ConsultaProcessoPanel() {
  const [display, setDisplay] = useState("");
  const [tribunal, setTribunal] = useState("auto");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState<{
    tribunal: string;
    numeroProcesso: string;
    hits: HitSource[];
  } | null>(null);

  const groupedOptions = useMemo(() => {
    const map = new Map<string, typeof DATAJUD_TRIBUNAL_OPTIONS>();
    for (const opt of DATAJUD_TRIBUNAL_OPTIONS) {
      const list = map.get(opt.group) ?? [];
      list.push(opt);
      map.set(opt.group, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
  }, []);

  const runConsulta = useCallback(async () => {
    const digits = onlyDigits(display);
    if (digits.length !== 20) {
      setStatus("idle");
      setPayload(null);
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);
    setPayload(null);

    try {
      const res = await fetch("/api/datajud/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numero: digits, tribunal }),
      });
      const json: unknown = await res.json();

      if (!res.ok) {
        const err =
          isRecord(json) && typeof json.error === "string"
            ? json.error
            : "Não foi possível concluir a consulta.";
        setErrorMessage(err);
        setStatus("error");
        return;
      }

      if (!isRecord(json)) {
        setErrorMessage("Resposta inesperada.");
        setStatus("error");
        return;
      }

      const tribunalRes = pickStr(json, "tribunal");
      const numeroProcesso = pickStr(json, "numeroProcesso");
      const resultado = json.resultado;
      const topHits = isRecord(resultado) ? resultado.hits : null;
      const hitsList =
        isRecord(topHits) && Array.isArray(topHits.hits)
          ? (topHits.hits as unknown[])
          : [];

      const hits: HitSource[] = [];
      for (const h of hitsList) {
        if (isRecord(h) && isRecord(h._source)) {
          hits.push(h._source);
        }
      }

      setPayload({
        tribunal: tribunalRes ?? tribunal,
        numeroProcesso: numeroProcesso ?? digits,
        hits,
      });
      setStatus("ok");
      setDisplay(formatCnjMask(digits));
    } catch {
      setErrorMessage("Falha de rede. Tente novamente.");
      setStatus("error");
    }
  }, [display, tribunal]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void runConsulta();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="consulta-processo-numero"
            className="text-sm text-neutral-300"
          >
            Número do processo (CNJ)
          </label>
          <input
            id="consulta-processo-numero"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="0000000-00.0000.0.00.0000"
            value={display}
            onChange={(e) => setDisplay(formatCnjMask(e.target.value))}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="consulta-processo-tribunal"
            className="text-sm text-neutral-300"
          >
            Tribunal (índice DataJud)
          </label>
          <select
            id="consulta-processo-tribunal"
            value={tribunal}
            onChange={(e) => setTribunal(e.target.value)}
            className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
          >
            <option value="auto">Automático (pelos dígitos J e TR do CNJ)</option>
            {groupedOptions.map(([group, opts]) => (
              <optgroup key={group} label={group}>
                {opts.map((o) => (
                  <option key={o.alias} value={o.alias}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={status === "loading" || onlyDigits(display).length !== 20}
          className="w-full rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {status === "loading" ? "Consultando…" : "Consultar DataJud"}
        </button>

        <p className="text-xs text-neutral-500">
          Dados públicos de capa e movimentações conforme a{" "}
          <a
            href="https://datajud-wiki.cnj.jus.br/api-publica/"
            target="_blank"
            rel="noreferrer"
            className="text-neutral-400 underline hover:text-neutral-200"
          >
            API pública do DataJud (CNJ)
          </a>
          . Processos sigilosos ou tribunais sem o processo no índice podem não
          retornar resultados. Não substitui consulta nos sistemas processuais
          dos tribunais.
        </p>

        {errorMessage ? (
          <p className="text-sm text-red-400/90">{errorMessage}</p>
        ) : null}
      </form>

      {status === "ok" && payload ? (
        <div className="space-y-4 border-t border-neutral-800 pt-6">
          <p className="text-sm text-neutral-400">
            Índice:{" "}
            <span className="font-mono text-neutral-200">{payload.tribunal}</span>{" "}
            · Nº{" "}
            <span className="font-mono text-neutral-200">
              {formatCnjMask(payload.numeroProcesso)}
            </span>
          </p>

          {payload.hits.length === 0 ? (
            <p className="text-sm text-amber-400/90">
              Nenhum registro encontrado neste tribunal para esse número. Tente
              outro índice (ex.: grau diferente) ou confirme se o processo já foi
              publicado no DataJud.
            </p>
          ) : (
            <ul className="space-y-4">
              {payload.hits.map((src, i) => (
                <li
                  key={i}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
                >
                  <ProcessoCard source={src} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function textoFormatoSistema(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  const codigo = pickNum(obj, "codigo");
  const nome = pickNestedNome(obj);
  const parts: string[] = [];
  if (codigo !== undefined) parts.push(String(codigo));
  if (nome) parts.push(nome);
  return parts.length ? parts.join(" — ") : nome;
}

function textoOrgaoJulgadorCapa(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  const nome = pickNestedNome(obj);
  const codigo = pickNum(obj, "codigo");
  const mun = pickNum(obj, "codigoMunicipioIBGE");
  const bits: string[] = [];
  if (nome) bits.push(nome);
  if (codigo !== undefined) bits.push(`cód. ${codigo}`);
  if (mun !== undefined) bits.push(`IBGE ${mun}`);
  return bits.length ? bits.join(" · ") : undefined;
}

function textoOrgaoMovimento(obj: unknown): string | undefined {
  if (!isRecord(obj)) return undefined;
  const nome = pickStr(obj, "nomeOrgao") ?? pickNestedNome(obj);
  const cod = pickNum(obj, "codigoOrgao");
  if (nome && cod !== undefined) return `${nome} (cód. ${cod})`;
  return nome ?? (cod !== undefined ? `Órgão cód. ${cod}` : undefined);
}

function linhaComplementos(m: Record<string, unknown>): ReactNode {
  const comps = m.complementosTabelados;
  if (!Array.isArray(comps) || comps.length === 0) return null;
  return (
    <ul className="mt-1 space-y-0.5 border-l border-neutral-700 pl-2 text-xs text-neutral-400">
      {comps.map((c, i) => {
        if (!isRecord(c)) return null;
        const desc = pickStr(c, "descricao") ?? pickStr(c, "nome");
        const val = pickStr(c, "valor");
        const cod = pickNum(c, "codigo");
        const bits = [cod !== undefined ? `#${cod}` : null, desc, val]
          .filter(Boolean)
          .join(" · ");
        return bits ? <li key={i}>{bits}</li> : null;
      })}
    </ul>
  );
}

function ProcessoCard({ source }: { source: HitSource }) {
  const idProc = pickStr(source, "id");
  const tribunalSigla = pickStr(source, "tribunal");
  const numeroRaw = pickStr(source, "numeroProcesso");
  const numeroFmt = formatNumeroCnjExibicao(numeroRaw) ?? numeroRaw;
  const grau = pickStr(source, "grau");
  const dataAjuizamento = pickStr(source, "dataAjuizamento");
  const nivelSigilo = pickNum(source, "nivelSigilo");
  const atualizado = pickStr(source, "dataHoraUltimaAtualizacao");
  const ts = pickStr(source, "@timestamp");
  const valorCausa = source.valorCausa;
  const valorCausaTxt =
    typeof valorCausa === "number"
      ? valorCausa.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : typeof valorCausa === "string" && valorCausa.trim() !== ""
        ? valorCausa
        : undefined;

  const classeRec = isRecord(source.classe) ? source.classe : null;
  const classeNome = classeRec ? pickNestedNome(classeRec) : undefined;
  const classeCod =
    classeRec !== null ? pickNum(classeRec, "codigo") : undefined;

  const orgaoCapa = textoOrgaoJulgadorCapa(source.orgaoJulgador);
  const formatoTxt = textoFormatoSistema(source.formato);
  const sistemaTxt = textoFormatoSistema(source.sistema);

  const assuntos = Array.isArray(source.assuntos) ? source.assuntos : [];
  const movimentos = Array.isArray(source.movimentos) ? source.movimentos : [];
  const ultimos = movimentos.slice(-50);

  const classeLinha =
    classeNome || classeCod !== undefined
      ? [
          classeCod !== undefined ? `Cód. ${classeCod}` : null,
          classeNome,
        ]
          .filter(Boolean)
          .join(" — ")
      : null;

  return (
    <div className="space-y-4 text-sm">
      <dl className="space-y-2">
        <DetalheLinha rotulo="ID (DataJud)" valor={idProc} />
        <DetalheLinha rotulo="Tribunal" valor={tribunalSigla} />
        <DetalheLinha
          rotulo="Número (CNJ)"
          valor={
            numeroFmt ? (
              <span className="font-mono text-neutral-100">{numeroFmt}</span>
            ) : null
          }
        />
        <DetalheLinha rotulo="Grau" valor={grau} />
        <DetalheLinha rotulo="Data de ajuizamento" valor={dataAjuizamento} />
        <DetalheLinha
          rotulo="Nível de sigilo"
          valor={
            nivelSigilo !== undefined ? String(nivelSigilo) : undefined
          }
        />
        <DetalheLinha rotulo="Formato" valor={formatoTxt} />
        <DetalheLinha rotulo="Sistema processual" valor={sistemaTxt} />
        <DetalheLinha rotulo="Última atualização (origem)" valor={atualizado} />
        <DetalheLinha rotulo="@timestamp" valor={ts} />
        <DetalheLinha rotulo="Classe processual" valor={classeLinha} />
        <DetalheLinha rotulo="Órgão julgador" valor={orgaoCapa} />
        <DetalheLinha rotulo="Valor da causa" valor={valorCausaTxt} />
      </dl>

      {assuntos.length > 0 ? (
        <div>
          <p className="text-neutral-500">Assuntos ({assuntos.length})</p>
          <ul className="mt-1 list-inside list-disc text-neutral-300">
            {assuntos.map((a, idx) => {
              if (!isRecord(a)) return null;
              const nome = pickNestedNome(a);
              const cod = pickNum(a, "codigo");
              const line =
                cod !== undefined && nome
                  ? `${cod} — ${nome}`
                  : nome ?? (cod !== undefined ? String(cod) : null);
              return line ? <li key={idx}>{line}</li> : null;
            })}
          </ul>
        </div>
      ) : null}

      {ultimos.length > 0 ? (
        <div>
          <p className="text-neutral-500">
            Movimentações (últimas {ultimos.length}
            {movimentos.length > ultimos.length
              ? ` de ${movimentos.length}`
              : ""}
            )
          </p>
          <ul className="mt-2 max-h-96 space-y-3 overflow-y-auto text-neutral-300">
            {ultimos.map((m, idx) => {
              if (!isRecord(m)) return null;
              const nome = pickNestedNome(m) ?? pickStr(m, "nome");
              const dh = pickStr(m, "dataHora");
              const codMov = pickNum(m, "codigo");
              const orgMov = isRecord(m.orgaoJulgador)
                ? textoOrgaoMovimento(m.orgaoJulgador)
                : undefined;
              return (
                <li
                  key={idx}
                  className="border-l-2 border-neutral-700 pl-2 text-xs sm:text-sm"
                >
                  <div>
                    {dh ? (
                      <span className="text-neutral-500">{dh} — </span>
                    ) : null}
                    {codMov !== undefined ? (
                      <span className="text-neutral-500">[{codMov}] </span>
                    ) : null}
                    {nome ?? "Movimentação"}
                  </div>
                  {orgMov ? (
                    <p className="mt-0.5 text-xs text-neutral-500">
                      Órgão: {orgMov}
                    </p>
                  ) : null}
                  {linhaComplementos(m)}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
