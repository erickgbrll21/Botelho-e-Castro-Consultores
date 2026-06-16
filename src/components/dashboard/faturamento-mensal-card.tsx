"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import BanknotesIcon from "@heroicons/react/24/outline/BanknotesIcon";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const STORAGE_KEY = "bcc-dashboard-faturamento-visivel";

type Props = {
  title: string;
  valorFormatado: string;
  subtitulo: string;
};

export function FaturamentoMensalCard({
  title,
  valorFormatado,
  subtitulo,
}: Props) {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    setVisivel(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleVisibilidade() {
    setVisivel((atual) => {
      const proximo = !atual;
      localStorage.setItem(STORAGE_KEY, proximo ? "1" : "0");
      return proximo;
    });
  }

  return (
    <Card
      title={title}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleVisibilidade}
            className="rounded-lg bg-neutral-800/60 p-1.5 text-neutral-300 transition hover:bg-neutral-800 hover:text-neutral-100"
            title={visivel ? "Ocultar valor" : "Mostrar valor"}
            aria-label={
              visivel
                ? "Ocultar faturamento mensal"
                : "Mostrar faturamento mensal"
            }
            aria-pressed={visivel}
          >
            {visivel ? (
              <EyeSlashIcon className="h-4 w-4" aria-hidden />
            ) : (
              <EyeIcon className="h-4 w-4" aria-hidden />
            )}
          </button>
          <BanknotesIcon className="h-4 w-4 text-amber-400" aria-hidden />
        </div>
      }
    >
      {visivel ? (
        <p className="text-3xl font-semibold text-amber-200/95 tabular-nums transition-opacity duration-300 ease-out">
          {valorFormatado}
        </p>
      ) : (
        <div
          className="text-3xl font-semibold text-amber-200/95 tabular-nums"
          role="img"
          aria-label="Faturamento mensal oculto"
        >
          R$ ••••••
        </div>
      )}
      <p className="text-xs text-neutral-400">{subtitulo}</p>
    </Card>
  );
}
