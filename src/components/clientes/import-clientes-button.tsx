"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

interface ImportClientesButtonProps {
  grupos: { id: string; nome: string }[];
}

const COLUNAS = [
  {
    nomes: "Empresas, Empresa, Razão Social ou razao_social",
    obrigatoria: true,
    exemplo: "XPTO Serviços Ltda",
    notas: "Pelo menos um desses cabeçalhos; a linha é ignorada se estiver vazia.",
  },
  {
    nomes: "CNPJ",
    obrigatoria: false,
    exemplo: "12.345.678/0001-90",
    notas: "Somente números na gravação. Evite duplicar CNPJ já cadastrado.",
  },
  {
    nomes: "Grupo",
    obrigatoria: false,
    exemplo: "Grupo ABC",
    notas: "Deve coincidir com o nome de um grupo já cadastrado no sistema (ignora maiúsculas/minúsculas).",
  },
  {
    nomes: "Domínio",
    obrigatoria: false,
    exemplo: "empresa.com.br",
    notas: "",
  },
  {
    nomes: "Unidade",
    obrigatoria: false,
    exemplo: "Matriz ou Filial",
    notas: "Texto contendo “matriz” ou “filial”.",
  },
  {
    nomes: "Cidade",
    obrigatoria: false,
    exemplo: "São Paulo",
    notas: "",
  },
  {
    nomes: "UF",
    obrigatoria: false,
    exemplo: "SP",
    notas: "",
  },
  {
    nomes: "CEP ou cep",
    obrigatoria: false,
    exemplo: "01310-100",
    notas: "8 dígitos após normalização.",
  },
  {
    nomes: "Insc. Estadual",
    obrigatoria: false,
    exemplo: "123.456.789.110",
    notas: "",
  },
  {
    nomes: "Insc. Municipal",
    obrigatoria: false,
    exemplo: "—",
    notas: "",
  },
  {
    nomes: "Regime Tributação",
    obrigatoria: false,
    exemplo: "Simples Nacional",
    notas: "Texto livre gravado no cadastro.",
  },
  {
    nomes: "Atividade",
    obrigatoria: false,
    exemplo: "Serviço",
    notas: "Reconhece palavras-chave: serviço, comércio, indústria, ambos.",
  },
  {
    nomes: "Entrada",
    obrigatoria: false,
    exemplo: "01/03/2024",
    notas: "Data no Excel (número de série) ou texto dd/mm/aaaa.",
  },
  {
    nomes: "Constituição",
    obrigatoria: false,
    exemplo: "Sim ou Não",
    notas: "",
  },
] as const;

export function ImportClientesButton({ grupos }: ImportClientesButtonProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"importar" | "formato">("importar");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonData || jsonData.length === 0) {
        throw new Error(
          "A planilha está vazia ou não pôde ser lida. Use a primeira aba do arquivo."
        );
      }

      const response = await fetch("/api/clientes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clients: jsonData }),
      });

      let result: { error?: string; count?: number; skipped?: number };
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch {
        throw new Error("Erro inesperado no servidor (resposta inválida).");
      }

      if (!response.ok) {
        throw new Error(result.error || "Erro no servidor ao processar a importação.");
      }

      if (result.count === 0) {
        if (result.skipped && result.skipped > 0) {
          throw new Error(
            `Nenhum cliente foi importado. ${result.skipped} linhas foram puladas por falta de razão social ou colunas incorretas.`
          );
        }
        throw new Error("Nenhum cliente foi importado. Verifique o formato da planilha.");
      }

      alert(
        `${result.count} clientes importados com sucesso!${result.skipped && result.skipped > 0 ? ` (${result.skipped} linhas ignoradas)` : ""}`
      );
      router.refresh();
      setOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao importar.";
      setError(message);
      alert("Erro na importação: " + message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <button
        type="button"
        disabled={importing}
        onClick={() => {
          setOpen(true);
          setTab("importar");
          setError(null);
        }}
        className="flex items-center justify-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50"
      >
        {importing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
            Importando...
          </>
        ) : (
          "Importar planilha"
        )}
      </button>

      {error && !open && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
          <p className="text-xs font-medium text-red-500">{error}</p>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="glass-panel max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-800/80 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
              <h2
                id="import-modal-title"
                className="text-lg font-semibold text-neutral-50"
              >
                Importar clientes por planilha
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-1 border-b border-neutral-800 px-4 pt-2">
              <button
                type="button"
                onClick={() => setTab("importar")}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  tab === "importar"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Importar
              </button>
              <button
                type="button"
                onClick={() => setTab("formato")}
                className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                  tab === "formato"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Formato da planilha
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {tab === "importar" && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-400">
                    Use a <strong className="text-neutral-200">primeira aba</strong> do
                    arquivo (.xlsx, .xls ou .csv). A primeira linha deve ser o cabeçalho
                    com os nomes das colunas. Abra a aba{" "}
                    <strong className="text-neutral-200">Formato da planilha</strong> para
                    ver a lista completa e exemplos.
                  </p>
                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                      {error}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={importing}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50 sm:w-auto"
                  >
                    {importing ? "Processando…" : "Escolher arquivo"}
                  </button>
                </div>
              )}

              {tab === "formato" && (
                <div className="space-y-4">
                  <p className="text-sm text-neutral-400">
                    Os nomes das colunas podem variar levemente (maiúsculas, acentos e
                    espaços são ignorados na comparação). Use uma linha de cabeçalho e,
                    abaixo, uma linha por empresa.
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-neutral-800">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-900/80">
                          <th className="px-3 py-2 font-medium text-neutral-300">
                            Coluna (cabeçalho)
                          </th>
                          <th className="px-3 py-2 font-medium text-neutral-300">
                            Obrigatória
                          </th>
                          <th className="px-3 py-2 font-medium text-neutral-300">
                            Exemplo
                          </th>
                          <th className="px-3 py-2 font-medium text-neutral-300">
                            Observações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800">
                        {COLUNAS.map((row) => (
                          <tr key={row.nomes} className="align-top">
                            <td className="px-3 py-2 font-mono text-xs text-neutral-200">
                              {row.nomes}
                            </td>
                            <td className="px-3 py-2 text-neutral-300">
                              {row.obrigatoria ? "Sim" : "Não"}
                            </td>
                            <td className="px-3 py-2 text-neutral-400">{row.exemplo}</td>
                            <td className="px-3 py-2 text-xs text-neutral-500">
                              {row.notas || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100/90">
                    <p className="font-semibold text-amber-200">Grupos cadastrados</p>
                    <p className="mt-1 text-amber-100/80">
                      O valor da coluna <strong>Grupo</strong> precisa ser{" "}
                      <strong>igual ao nome</strong> de um grupo já criado em{" "}
                      <em>Clientes → Grupos de clientes</em>. Grupos disponíveis:{" "}
                      {grupos.length > 0
                        ? grupos.map((g) => g.nome).join(", ")
                        : "nenhum ainda — cadastre grupos antes de vincular."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
