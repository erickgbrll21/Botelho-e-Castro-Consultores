-- 0017_auth_is_admin_controladoria.sql
-- Adiciona 'controladoria' à função `public.auth_is_admin()`.
--
-- Causa raiz do erro 500 ao salvar com tipo_usuario='controladoria':
--   As policies `admins gerenciam ...` em clientes / responsaveis_internos /
--   servicos_contratados usam `auth_is_admin()` em USING e WITH CHECK.
--   A função listava só ('admin','diretor','financeiro'), barrando o
--   controladoria em qualquer INSERT/UPDATE/DELETE nessas tabelas.
--
-- A função `auth_has_cliente_access(uuid)` chama `auth_is_admin()`, então
-- ela passa a aceitar controladoria automaticamente após esta atualização.

create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid()
      and u.tipo_usuario in ('admin', 'diretor', 'financeiro', 'controladoria')
  );
$function$;

-- Acerta também a policy de SELECT em logs_sistema (formato com ARRAY[...]
-- que escapou da varredura defensiva da migration 0016).
drop policy if exists "Admins podem ver logs" on public.logs_sistema;

create policy "Admins podem ver logs"
on public.logs_sistema
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios
    where usuarios.id = auth.uid()
      and usuarios.tipo_usuario = any (
        array['admin'::text, 'diretor'::text, 'financeiro'::text, 'controladoria'::text]
      )
  )
);
