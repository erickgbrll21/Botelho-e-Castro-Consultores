-- Quadro de sócios por grupo econômico (contato consolidado do grupo).

create table if not exists public.quadro_socios_grupo (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_economicos (id) on delete cascade,
  nome_socio text not null,
  cpf text,
  email text,
  telefone text,
  percentual_participacao numeric(5, 2),
  created_at timestamptz not null default now()
);

create index if not exists quadro_socios_grupo_grupo_id_idx
  on public.quadro_socios_grupo (grupo_id);

alter table public.quadro_socios_grupo enable row level security;

drop policy if exists "quadro_socios_grupo_select_authenticated"
  on public.quadro_socios_grupo;

create policy "quadro_socios_grupo_select_authenticated"
on public.quadro_socios_grupo
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = auth.uid()
  )
);

drop policy if exists "quadro_socios_grupo_insert_elevated"
  on public.quadro_socios_grupo;

create policy "quadro_socios_grupo_insert_elevated"
on public.quadro_socios_grupo
for insert
to authenticated
with check (public.is_elevated_role());

drop policy if exists "quadro_socios_grupo_update_elevated"
  on public.quadro_socios_grupo;

create policy "quadro_socios_grupo_update_elevated"
on public.quadro_socios_grupo
for update
to authenticated
using (public.is_elevated_role())
with check (public.is_elevated_role());

drop policy if exists "quadro_socios_grupo_delete_elevated"
  on public.quadro_socios_grupo;

create policy "quadro_socios_grupo_delete_elevated"
on public.quadro_socios_grupo
for delete
to authenticated
using (public.is_elevated_role());
