-- Tabelas principais
create extension if not exists "uuid-ossp";

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null unique,
  cargo text null,
  tipo_usuario text not null check (tipo_usuario in ('admin', 'user')) default 'user',
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.clientes (
  id uuid primary key default uuid_generate_v4(),
  razao_social text not null,
  cnpj text not null unique,
  grupo_economico text null,
  socio_responsavel_pj text null,
  capital_social numeric(18,2) null,
  data_abertura_cliente date null,
  data_entrada_contabilidade date null,
  regime_tributario text null,
  processos_ativos integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.quadro_socios (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  nome_socio text not null,
  percentual_participacao numeric(5,2) null
);

create table if not exists public.responsaveis_internos (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  responsavel_comercial text null,
  responsavel_contabil text null,
  responsavel_juridico text null,
  responsavel_planejamento_tributario text null
);

create table if not exists public.servicos_contratados (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  contabilidade boolean default false,
  juridico boolean default false,
  planejamento_tributario boolean default false
);

create table if not exists public.cliente_usuarios (
  id uuid primary key default uuid_generate_v4(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  unique (cliente_id, usuario_id)
);

-- Funções auxiliares
create or replace function public.auth_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid()
      and u.tipo_usuario = 'admin'
  );
$$;

create or replace function public.auth_has_cliente_access(target_cliente uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth_is_admin()
    or exists (
      select 1
      from public.cliente_usuarios eu
      where eu.usuario_id = auth.uid()
        and eu.cliente_id = target_cliente
    );
$$;

-- RLS
alter table public.usuarios enable row level security;
alter table public.clientes enable row level security;
alter table public.quadro_socios enable row level security;
alter table public.responsaveis_internos enable row level security;
alter table public.servicos_contratados enable row level security;
alter table public.cliente_usuarios enable row level security;

-- Usuários
create policy "admins gerenciam usuarios"
  on public.usuarios
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuario visualiza proprio registro"
  on public.usuarios
  for select
  using (auth.uid() = id or auth_is_admin());

-- Clientes
create policy "admins gerenciam clientes"
  on public.clientes
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuario vê apenas clientes atribuídas"
  on public.clientes
  for select
  using (auth_has_cliente_access(id));

-- Quadro de sócios
create policy "admins gerenciam socios"
  on public.quadro_socios
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuario vê socios da cliente"
  on public.quadro_socios
  for select
  using (auth_has_cliente_access(cliente_id));

-- Responsáveis internos
create policy "admins gerenciam responsaveis"
  on public.responsaveis_internos
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuario vê responsaveis da cliente"
  on public.responsaveis_internos
  for select
  using (auth_has_cliente_access(cliente_id));

-- Serviços contratados
create policy "admins gerenciam serviços"
  on public.servicos_contratados
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

create policy "usuario vê serviços da cliente"
  on public.servicos_contratados
  for select
  using (auth_has_cliente_access(cliente_id));

-- Relação cliente-usuario
create policy "apenas admin gerencia acessos"
  on public.cliente_usuarios
  for all
  using (auth_is_admin())
  with check (auth_is_admin());

-- Recomendações operacionais:
-- 1) Desabilite sign-up público no Auth do Supabase.
-- 2) Crie usuários somente via service role (painel de admins ou CLI).
-- 3) Use service role somente em ações de servidor; nunca exponha no frontend.
