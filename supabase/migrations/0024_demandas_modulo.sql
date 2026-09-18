-- 0024_demandas_modulo.sql
-- Módulo "Controle de Demandas": distribuição e acompanhamento de tarefas dos
-- funcionários. Usa apenas public.usuarios (autenticação/cadastro já existente).
--
-- IMPORTANTE: este módulo NÃO possui qualquer vínculo com clientes
-- (sem cliente_id, sem FK para public.clientes).
--
-- Estrutura criada:
--   type  public.demanda_status        ('pendente','em_andamento','aguardando_confirmacao','concluida')
--   table public.tipos_servico         (cadastro dinâmico, sem hardcode no app)
--   table public.demandas
--   table public.historico_demandas
--   view  public.demandas_view         (leitura com nomes resolvidos + "atrasada")
--
-- Segurança (RLS):
--   Gestor  = admin / diretor / financeiro / controladoria (mesmo conjunto de
--             requireAdminProfile() no app) -> vê e gerencia todas as demandas.
--   Usuário = vê apenas demandas atribuídas a ele (ou criadas por ele) e pode
--             alterar somente status, protocolo e observações (trigger de guarda).

create extension if not exists pgcrypto;

-- =============================================================================
-- 1) Enum de status
-- =============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'demanda_status' and n.nspname = 'public'
  ) then
    create type public.demanda_status as enum (
      'pendente',
      'em_andamento',
      'aguardando_confirmacao',
      'concluida'
    );
  end if;
end $$;

-- =============================================================================
-- 2) Papel "gestor de demandas" (mesma lista usada nas demais policies do painel)
-- =============================================================================
create or replace function public.demandas_is_gestor()
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
      and u.tipo_usuario in ('admin', 'diretor', 'financeiro', 'controladoria')
  );
$$;

-- =============================================================================
-- 3) Atualização automática de updated_at
-- =============================================================================
create or replace function public.demandas_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =============================================================================
-- 4) tipos_servico
-- =============================================================================
create table if not exists public.tipos_servico (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tipos_servico_nome_nao_vazio check (length(btrim(nome)) > 0)
);

create unique index if not exists tipos_servico_nome_unique
  on public.tipos_servico (lower(btrim(nome)));

drop trigger if exists tipos_servico_set_updated_at on public.tipos_servico;
create trigger tipos_servico_set_updated_at
  before update on public.tipos_servico
  for each row execute function public.demandas_set_updated_at();

-- Tipos iniciais (novos tipos são cadastrados pela tela, sem alterar código).
insert into public.tipos_servico (nome)
values
  ('Alteração Contratual'),
  ('Constituição'),
  ('ITBI'),
  ('Transformação')
on conflict do nothing;

-- =============================================================================
-- 5) demandas
-- =============================================================================
create table if not exists public.demandas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  tipo_servico_id uuid references public.tipos_servico (id) on delete restrict,
  -- on delete set null: manter a exclusão de usuários funcionando (a demanda
  -- fica "sem responsável" e o gestor reatribui).
  responsavel_id uuid references public.usuarios (id) on delete set null,
  criado_por uuid references public.usuarios (id) on delete set null,
  prazo_final timestamptz not null,
  protocolo text,
  status public.demanda_status not null default 'pendente',
  url_pasta text,
  caminho_pasta text,
  observacoes text,
  concluida_em timestamptz,
  concluida_por uuid references public.usuarios (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint demandas_titulo_nao_vazio check (length(btrim(titulo)) > 0),
  constraint demandas_conclusao_coerente check (
    (status = 'concluida' and concluida_em is not null)
    or (status <> 'concluida' and concluida_em is null)
  )
);

create index if not exists demandas_responsavel_idx on public.demandas (responsavel_id);
create index if not exists demandas_status_idx on public.demandas (status);
create index if not exists demandas_prazo_final_idx on public.demandas (prazo_final);
create index if not exists demandas_tipo_servico_idx on public.demandas (tipo_servico_id);
create index if not exists demandas_created_at_idx on public.demandas (created_at desc);
create index if not exists demandas_protocolo_idx on public.demandas (lower(protocolo));

drop trigger if exists demandas_set_updated_at on public.demandas;
create trigger demandas_set_updated_at
  before update on public.demandas
  for each row execute function public.demandas_set_updated_at();

-- =============================================================================
-- 6) historico_demandas
-- =============================================================================
create table if not exists public.historico_demandas (
  id uuid primary key default gen_random_uuid(),
  demanda_id uuid not null references public.demandas (id) on delete cascade,
  usuario_id uuid references public.usuarios (id) on delete set null,
  -- snapshot do nome (mesmo padrão de logs_sistema.usuario_nome)
  usuario_nome text,
  acao text not null,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz not null default now()
);

create index if not exists historico_demandas_demanda_idx
  on public.historico_demandas (demanda_id, created_at desc);

-- =============================================================================
-- 7) Guarda de coluna para usuário comum
--    RLS controla a linha; este trigger controla QUAIS campos podem mudar.
-- =============================================================================
create or replace function public.demandas_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Contextos sem JWT (service role / SQL Editor) já ignoram RLS: não bloqueia.
  if auth.uid() is null or public.demandas_is_gestor() then
    return new;
  end if;

  if old.responsavel_id is distinct from auth.uid() then
    raise exception 'Sem permissão para alterar esta demanda.' using errcode = '42501';
  end if;

  if new.titulo is distinct from old.titulo
     or new.descricao is distinct from old.descricao
     or new.tipo_servico_id is distinct from old.tipo_servico_id
     or new.responsavel_id is distinct from old.responsavel_id
     or new.criado_por is distinct from old.criado_por
     or new.prazo_final is distinct from old.prazo_final
     or new.url_pasta is distinct from old.url_pasta
     or new.caminho_pasta is distinct from old.caminho_pasta then
    raise exception
      'Usuário responsável pode alterar apenas status, protocolo e observações.'
      using errcode = '42501';
  end if;

  -- Confirmação final (concluida) é exclusiva do gestor.
  if new.status is distinct from old.status
     and new.status = 'concluida'::public.demanda_status then
    raise exception
      'A confirmação final da demanda é exclusiva do gestor.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists demandas_guard_update on public.demandas;
create trigger demandas_guard_update
  before update on public.demandas
  for each row execute function public.demandas_guard_update();

-- =============================================================================
-- 8) View de leitura
--    security_invoker = false: a view roda com os direitos do owner e aplica o
--    filtro de acesso no WHERE. Assim o usuário comum enxerga o NOME do
--    responsável/criador da própria demanda sem liberar SELECT em public.usuarios.
-- =============================================================================
drop view if exists public.demandas_view;

create view public.demandas_view
with (security_invoker = false) as
select
  d.id,
  d.titulo,
  d.descricao,
  d.tipo_servico_id,
  ts.nome as tipo_servico_nome,
  d.responsavel_id,
  ur.nome as responsavel_nome,
  d.criado_por,
  uc.nome as criado_por_nome,
  d.prazo_final,
  d.protocolo,
  d.status,
  d.url_pasta,
  d.caminho_pasta,
  d.observacoes,
  d.concluida_em,
  d.concluida_por,
  ucc.nome as concluida_por_nome,
  d.created_at,
  d.updated_at,
  (d.status <> 'concluida' and d.prazo_final < now()) as atrasada
from public.demandas d
left join public.tipos_servico ts on ts.id = d.tipo_servico_id
left join public.usuarios ur on ur.id = d.responsavel_id
left join public.usuarios uc on uc.id = d.criado_por
left join public.usuarios ucc on ucc.id = d.concluida_por
where
  public.demandas_is_gestor()
  or d.responsavel_id = auth.uid()
  or d.criado_por = auth.uid();

grant select on public.demandas_view to authenticated;

-- =============================================================================
-- 9) RLS
-- =============================================================================
alter table public.tipos_servico enable row level security;
alter table public.demandas enable row level security;
alter table public.historico_demandas enable row level security;

-- --- tipos_servico -----------------------------------------------------------
drop policy if exists "tipos_servico_select_authenticated" on public.tipos_servico;
create policy "tipos_servico_select_authenticated"
on public.tipos_servico
for select
to authenticated
using (
  exists (select 1 from public.usuarios u where u.id = auth.uid())
);

drop policy if exists "tipos_servico_insert_gestor" on public.tipos_servico;
create policy "tipos_servico_insert_gestor"
on public.tipos_servico
for insert
to authenticated
with check (public.demandas_is_gestor());

drop policy if exists "tipos_servico_update_gestor" on public.tipos_servico;
create policy "tipos_servico_update_gestor"
on public.tipos_servico
for update
to authenticated
using (public.demandas_is_gestor())
with check (public.demandas_is_gestor());

-- Sem policy de DELETE: tipos usados por demandas históricas não são excluídos,
-- apenas desativados (ativo = false).

-- --- demandas ----------------------------------------------------------------
drop policy if exists "demandas_select_gestor_ou_responsavel" on public.demandas;
create policy "demandas_select_gestor_ou_responsavel"
on public.demandas
for select
to authenticated
using (
  public.demandas_is_gestor()
  or responsavel_id = auth.uid()
  or criado_por = auth.uid()
);

drop policy if exists "demandas_insert_gestor" on public.demandas;
create policy "demandas_insert_gestor"
on public.demandas
for insert
to authenticated
with check (
  public.demandas_is_gestor()
  and criado_por = auth.uid()
);

drop policy if exists "demandas_update_gestor_ou_responsavel" on public.demandas;
create policy "demandas_update_gestor_ou_responsavel"
on public.demandas
for update
to authenticated
using (
  public.demandas_is_gestor()
  or responsavel_id = auth.uid()
)
with check (
  public.demandas_is_gestor()
  or responsavel_id = auth.uid()
);

drop policy if exists "demandas_delete_gestor" on public.demandas;
create policy "demandas_delete_gestor"
on public.demandas
for delete
to authenticated
using (public.demandas_is_gestor());

-- --- historico_demandas ------------------------------------------------------
drop policy if exists "historico_demandas_select" on public.historico_demandas;
create policy "historico_demandas_select"
on public.historico_demandas
for select
to authenticated
using (
  exists (
    select 1
    from public.demandas d
    where d.id = historico_demandas.demanda_id
      and (
        public.demandas_is_gestor()
        or d.responsavel_id = auth.uid()
        or d.criado_por = auth.uid()
      )
  )
);

drop policy if exists "historico_demandas_insert" on public.historico_demandas;
create policy "historico_demandas_insert"
on public.historico_demandas
for insert
to authenticated
with check (
  usuario_id = auth.uid()
  and exists (
    select 1
    from public.demandas d
    where d.id = historico_demandas.demanda_id
      and (
        public.demandas_is_gestor()
        or d.responsavel_id = auth.uid()
        or d.criado_por = auth.uid()
      )
  )
);

-- Histórico é imutável: sem policies de UPDATE/DELETE.

comment on table public.demandas is
  'Demandas/tarefas internas atribuídas a usuários do painel. Sem vínculo com clientes.';
comment on view public.demandas_view is
  'Leitura de demandas com nomes resolvidos e flag "atrasada" (prazo vencido e não concluída).';
