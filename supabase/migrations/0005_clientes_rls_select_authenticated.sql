-- O app lê `clientes` com JWT (papel authenticated + anon key).
-- No Table Editor o papel postgres ignora RLS — por isso os dados aparecem no painel
-- mas a lista no app pode vir vazia se não houver política SELECT compatível.
-- Esta política é PERMISSIVE e combina com as demais por OR: basta uma permitir a linha.

alter table public.clientes enable row level security;

drop policy if exists "usuarios_autenticados_leem_clientes" on public.clientes;

create policy "usuarios_autenticados_leem_clientes"
on public.clientes
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
  )
);

-- Se a listagem ainda falhar ou vier sem grupo/serviços embutidos, no Supabase confira se
-- `grupos_economicos`, `responsaveis_internos` e `servicos_contratados` têm RLS: com RLS ativo
-- é preciso política SELECT para o papel `authenticated` (não habilite RLS aqui sem políticas
-- de escrita — isso bloquearia INSERT/UPDATE/DELETE nessas tabelas).
