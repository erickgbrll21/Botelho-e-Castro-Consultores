import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-5xl w-full flex flex-col md:flex-row gap-10 items-center justify-between">
        <div className="space-y-4 md:max-w-sm flex flex-col items-start">
          <img
            src={`/design-logo.svg?v=${Date.now()}`}
            alt="Design Complementar"
            width={280}
            height={80}
            className="h-auto w-full max-w-[280px] object-contain opacity-80"
          />
          <Image
            src="/logo-bcc.svg"
            alt="Botelho e Castro Consultores"
            width={280}
            height={80}
            className="h-auto w-full max-w-[280px] max-h-24 object-contain"
            priority
          />
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Botelho e Castro Consultores
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
            Controle total, dados seguros.
          </h1>
          <p className="text-neutral-400">
            Painel interno para gestão de clientes, responsabilidades e
            serviços. Autenticação obrigatória em todas as rotas.
          </p>
        </div>
        <Suspense fallback={<div className="glass-panel max-w-md w-full rounded-2xl p-8 h-[400px] animate-pulse bg-neutral-900/50" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
