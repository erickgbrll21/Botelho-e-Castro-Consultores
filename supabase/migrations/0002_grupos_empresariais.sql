create table if not exists public.grupos_empresariais (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  descricao text null,
  created_at timestamptz default now()
);

alter table public.grupos_empresariais enable row level security;

create policy "admins gerenciam grupos"
  on public.grupos_empresariais
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuarios leem grupos"
  on public.grupos_empresariais
  for select
  using (true);

-- Associação opcional de empresas a grupos
alter table public.empresas
  add column if not exists grupo_id uuid references public.grupos_empresariais(id);
