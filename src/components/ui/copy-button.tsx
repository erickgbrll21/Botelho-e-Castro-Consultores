"use client";

import { useState } from "react";
import {
  CheckIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

type CopyButtonProps = {
  value: string | null | undefined;
  label?: string;
  className?: string;
};

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const text = value?.trim() ?? "";

  if (!text) return null;

  async function handleCopy(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ? `Copiar ${label}` : "Copiar"}
      title={copied ? "Copiado!" : label ? `Copiar ${label}` : "Copiar"}
      className={clsx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-700/80 bg-neutral-900/80 text-neutral-400 transition hover:border-neutral-500 hover:bg-neutral-800 hover:text-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        copied && "border-emerald-500/40 text-emerald-400",
        className
      )}
    >
      {copied ? (
        <CheckIcon className="h-4 w-4" aria-hidden />
      ) : (
        <ClipboardDocumentIcon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
