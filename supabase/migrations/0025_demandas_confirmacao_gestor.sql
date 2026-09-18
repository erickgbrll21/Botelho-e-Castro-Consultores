-- 0025_demandas_confirmacao_gestor.sql
-- Fluxo de conclusão em duas etapas:
--   1) Usuário marca como concluída → status = aguardando_confirmacao
--   2) Gestor confirma → status = concluida (registra concluida_em / concluida_por)
--
-- O usuário responsável NÃO pode gravar status = concluida (confirmação final).

-- =============================================================================
-- 1) Novo valor no enum
-- =============================================================================
do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'demanda_status'
      and e.enumlabel = 'aguardando_confirmacao'
  ) then
    alter type public.demanda_status add value 'aguardando_confirmacao' after 'em_andamento';
  end if;
end $$;

-- =============================================================================
-- 2) Guarda: responsável não pode confirmar definitivamente
-- =============================================================================
create or replace function public.demandas_guard_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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

comment on type public.demanda_status is
  'pendente | em_andamento | aguardando_confirmacao (usuário) | concluida (gestor)';
