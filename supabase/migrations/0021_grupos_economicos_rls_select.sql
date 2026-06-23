-- Permite listar grupos econômicos no dashboard e filtros (JWT authenticated).

alter table public.grupos_economicos enable row level security;

drop policy if exists "grupos_economicos_select_authenticated"
  on public.grupos_economicos;

create policy "grupos_economicos_select_authenticated"
on public.grupos_economicos
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
  )
);
