-- =============================================================================
-- EXEMPLO DE POLÍTICAS RLS (NÃO APLICAR EM PRODUÇÃO SEM REVISÃO COMPLETA)
-- =============================================================================
-- Objetivo: ilustrar SELECT/INSERT/UPDATE/DELETE com auth.uid() e tipo_usuario.
-- O app usa a chave anon + JWT; políticas incorretas quebram o painel.
--
-- Pré-requisitos:
--   - Tabela public.usuarios (id uuid = auth.uid(), tipo_usuario text)
--   - Testar cada política no SQL Editor antes de versionar.
--
-- Função auxiliar (recomendada): papel elevado
-- =============================================================================

create or replace function public.is_elevated_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
      and u.tipo_usuario in ('admin', 'diretor', 'financeiro')
  );
$$;

-- -----------------------------------------------------------------------------
-- EXEMPLO: clientes
-- -----------------------------------------------------------------------------
-- Ajuste conforme regra de negócio (ex.: usuário comum só lê, só elevated grava).

-- drop policy if exists "clientes_select_authenticated" on public.clientes;
-- create policy "clientes_select_authenticated"
-- on public.clientes
-- for select
-- to authenticated
-- using (
--   exists (select 1 from public.usuarios u where u.id = auth.uid())
-- );

-- drop policy if exists "clientes_insert_elevated" on public.clientes;
-- create policy "clientes_insert_elevated"
-- on public.clientes
-- for insert
-- to authenticated
-- with check (public.is_elevated_role());

-- drop policy if exists "clientes_update_elevated" on public.clientes;
-- create policy "clientes_update_elevated"
-- on public.clientes
-- for update
-- to authenticated
-- using (public.is_elevated_role())
-- with check (public.is_elevated_role());

-- drop policy if exists "clientes_delete_elevated" on public.clientes;
-- create policy "clientes_delete_elevated"
-- on public.clientes
-- for delete
-- to authenticated
-- using (public.is_elevated_role());

-- -----------------------------------------------------------------------------
-- EXEMPLO: grupos_economicos, responsaveis_internos, servicos_contratados
-- -----------------------------------------------------------------------------
-- Mesmo padrão: SELECT para authenticated (se todos devem ver) ou só elevated;
-- escrita apenas para elevated — espelha server actions (requireAdminProfile).

-- -----------------------------------------------------------------------------
-- NOTAS
-- -----------------------------------------------------------------------------
-- 1) SERVICE ROLE do backend ignora RLS: use só no servidor, nunca no browser.
-- 2) Políticas PERMISSIVE somam com OR; negue com RESTRICTIVE se necessário.
-- 3) CSP (Content-Security-Policy) é configurada no Next (headers), não no PG.
-- 4) Monitoramento: Sentry/Datadog/OpenTelemetry no Node; manter PII redigido.
