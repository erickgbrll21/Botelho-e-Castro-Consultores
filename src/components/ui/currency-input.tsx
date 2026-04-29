"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  name: string;
  defaultValue?: number | string | null;
  placeholder?: string;
  className?: string;
  min?: number;
  disabled?: boolean;
  /** Se true, mostra "R$ " no início. */
  showSymbol?: boolean;
};

function digitsToPtbrMoney(digits: string): string {
  const d = (digits || "").replace(/\D/g, "");
  const safe = d.length === 0 ? "0" : d;
  const int = safe.slice(0, Math.max(0, safe.length - 2)) || "0";
  const cents = safe.slice(-2).padStart(2, "0");
  const intFormatted = Number(int).toLocaleString("pt-BR");
  return `${intFormatted},${cents}`;
}

function toDigitsFromAny(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  // já vem como número: 1234.56
  if (/^-?\d+(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return "";
    const cents = Math.round(n * 100);
    return String(Math.max(0, cents));
  }
  // pt-BR: "1.234,56" ou "R$ 1.234,56"
  return s.replace(/\D/g, "");
}

export function CurrencyInput({
  name,
  defaultValue,
  placeholder = "0,00",
  className,
  min,
  disabled,
  showSymbol,
}: Props) {
  const initialDigits = useMemo(
    () => toDigitsFromAny(defaultValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [digits, setDigits] = useState<string>(initialDigits);
  const ref = useRef<HTMLInputElement | null>(null);

  // Mantém o cursor no fim (máscara simples e estável).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.value.length;
    try {
      el.setSelectionRange(len, len);
    } catch {
      // ignore
    }
  }, [digits]);

  const display = digits.length ? digitsToPtbrMoney(digits) : "";
  const value = showSymbol && display ? `R$ ${display}` : display;

  return (
    <input
      ref={ref}
      name={name}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      placeholder={showSymbol ? `R$ ${placeholder}` : placeholder}
      value={value}
      onChange={(e) => {
        const nextDigits = e.target.value.replace(/\D/g, "").slice(0, 15);
        if (min != null) {
          const cents = Number(nextDigits || "0");
          const minCents = Math.round(Math.max(0, min) * 100);
          setDigits(String(Math.max(cents, minCents)));
          return;
        }
        setDigits(nextDigits);
      }}
      className={className}
    />
  );
}

