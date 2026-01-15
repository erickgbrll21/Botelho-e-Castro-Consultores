"use client";

import { useState, useTransition } from "react";

export function PasswordForm({ 
  updateAction 
}: { 
  updateAction: (formData: FormData) => Promise<void> 
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const password = String(formData.get("password"));
    const confirm = String(formData.get("confirmPassword"));

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    startTransition(async () => {
      try {
        await updateAction(formData);
        setSuccess(true);
        // Limpar campos seria bom aqui, mas como é server action + transition, 
        // o form não reseta automaticamente a menos que usemos um ref.
      } catch (e: any) {
        setError(e.message || "Erro ao atualizar senha.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Nova Senha</label>
        <input
          name="password"
          type="password"
          required
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
          placeholder="Minimo 6 caracteres"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm text-neutral-300">Confirmar Nova Senha</label>
        <input
          name="confirmPassword"
          type="password"
          required
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-neutral-100 focus:outline-none"
          placeholder="Repita a nova senha"
        />
      </div>

      {error && (
        <div className="text-xs text-red-500 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="text-xs text-emerald-500 font-medium">
          Senha atualizada com sucesso!
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-50"
      >
        {isPending ? "Atualizando..." : "Alterar Senha"}
      </button>
    </form>
  );
}
