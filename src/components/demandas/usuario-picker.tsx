"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import type { UsuarioAtribuivel } from "@/lib/demandas-queries";

const CAMPO =
  "w-full min-w-0 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-neutral-100 focus:outline-none";

/**
 * Select de responsável com busca. Mantemos o <select> nativo (validação
 * `required`, teclado e mobile) e usamos o campo de texto apenas para filtrar
 * as opções — inclusive quando a lista de funcionários cresce.
 */
export function UsuarioPicker({
  name,
  usuarios,
  defaultValue,
  required = false,
  label = "Responsável",
  id,
}: {
  name: string;
  usuarios: UsuarioAtribuivel[];
  defaultValue?: string | null;
  required?: boolean;
  label?: string;
  id?: string;
}) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(defaultValue ?? "");
  const selectId = id ?? `usuario-${name}`;

  const opcoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    // Inativos só aparecem se já forem o responsável atual da demanda.
    const base = usuarios.filter(
      (usuario) => usuario.ativo !== false || usuario.id === selecionado
    );
    if (!termo) return base;
    return base.filter((usuario) =>
      `${usuario.nome} ${usuario.email} ${usuario.cargo ?? ""}`
        .toLowerCase()
        .includes(termo)
    );
  }, [busca, usuarios, selecionado]);

  const selecionadoFora =
    selecionado && !opcoes.some((usuario) => usuario.id === selecionado)
      ? usuarios.find((usuario) => usuario.id === selecionado)
      : undefined;

  return (
    <div className="space-y-2">
      <label className="text-sm text-neutral-300" htmlFor={selectId}>
        {label}
        {required ? <span className="text-red-400"> *</span> : null}
      </label>

      <div className="relative">
        <MagnifyingGlassIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          aria-hidden
        />
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Pesquisar funcionário por nome, cargo ou e-mail..."
          aria-label="Pesquisar funcionário"
          className={`${CAMPO} pl-9`}
        />
      </div>

      <select
        id={selectId}
        name={name}
        required={required}
        value={selecionado}
        onChange={(event) => setSelecionado(event.target.value)}
        className={CAMPO}
      >
        <option value="">Selecione o funcionário responsável</option>
        {selecionadoFora ? (
          <option value={selecionadoFora.id}>
            {selecionadoFora.nome}
            {selecionadoFora.ativo === false ? " (inativo)" : ""}
          </option>
        ) : null}
        {opcoes.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>
            {usuario.nome}
            {usuario.cargo ? ` — ${usuario.cargo}` : ""}
            {usuario.ativo === false ? " (inativo)" : ""}
          </option>
        ))}
      </select>

      {busca.trim() && opcoes.length === 0 ? (
        <p className="text-xs text-neutral-500">
          Nenhum funcionário encontrado para “{busca.trim()}”.
        </p>
      ) : null}
    </div>
  );
}
