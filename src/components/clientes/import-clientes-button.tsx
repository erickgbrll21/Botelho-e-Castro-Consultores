"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { useRouter } from "next/navigation";

interface ImportClientesButtonProps {
  grupos: { id: string; nome: string }[];
}

export function ImportClientesButton({ grupos }: ImportClientesButtonProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("Arquivo selecionado:", file.name, "Tamanho:", file.size);
    setImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Tentativa de ler os dados
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      console.log("Dados lidos da planilha (primeiros 2):", jsonData.slice(0, 2));

      if (!jsonData || jsonData.length === 0) {
        throw new Error("A planilha está vazia ou não pôde ser lida. Verifique se os dados estão na primeira aba.");
      }

      // Enviar para a API
      const response = await fetch("/api/clientes/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clients: jsonData }),
      });

      console.log("Resposta da API - Status:", response.status);
      
      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("Erro ao parsear JSON da resposta:", text);
        throw new Error("Erro inesperado no servidor (resposta não é JSON).");
      }

      if (!response.ok) {
        throw new Error(result.error || "Erro no servidor ao processar a importação.");
      }

      if (result.count === 0) {
        if (result.skipped > 0) {
          throw new Error(`Nenhum cliente foi importado. ${result.skipped} linhas foram puladas por falta de campos obrigatórios (Razão Social/Empresa e CNPJ). Verifique os nomes das colunas.`);
        } else {
          throw new Error("Nenhum cliente foi importado. Verifique o formato da planilha.");
        }
      }

      alert(`${result.count} clientes importados com sucesso!${result.skipped > 0 ? ` (${result.skipped} linhas ignoradas)` : ""}`);
      router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Erro na importação:", err);
      setError(err.message || "Erro desconhecido ao importar.");
      alert("Erro na importação: " + (err.message || "Erro desconhecido"));
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
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      <button
        type="button"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
        className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {importing ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-white" />
            Importando...
          </>
        ) : (
          "Importar Planilha"
        )}
      </button>
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-xs text-red-500 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}
