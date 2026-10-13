"use client";

export function ImprimirRelatorioButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-neutral-200"
    >
      Imprimir ou salvar PDF
    </button>
  );
}
