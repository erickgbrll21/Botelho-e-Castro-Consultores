-- 0018_responsaveis_servicos_unique_cliente_id.sql
-- O PostgREST precisa de UNIQUE (ou índice de exclusão) em cliente_id para upsert ON CONFLICT.
-- Sem isso: "there is no unique or exclusion constraint matching the ON CONFLICT specification".
--
-- Deduplicação: não usamos max(id) porque id costuma ser uuid e max(uuid) não existe no PG.
-- Mantemos uma linha por cliente_id (preferindo created_at mais recente; empate por id::text).

-- servicos_contratados
delete from public.servicos_contratados s
where s.id in (
  select id
  from (
    select id,
           row_number() over (
             partition by cliente_id
             order by created_at desc nulls last, id::text desc
           ) as rn
    from public.servicos_contratados
  ) x
  where x.rn > 1
);

create unique index if not exists servicos_contratados_cliente_id_uidx
  on public.servicos_contratados (cliente_id);

comment on index public.servicos_contratados_cliente_id_uidx is
  'Permite upsert/onConflict(cliente_id) no app — um registro de serviços por cliente.';

-- responsaveis_internos
delete from public.responsaveis_internos r
where r.id in (
  select id
  from (
    select id,
           row_number() over (
             partition by cliente_id
             order by created_at desc nulls last, id::text desc
           ) as rn
    from public.responsaveis_internos
  ) x
  where x.rn > 1
);

create unique index if not exists responsaveis_internos_cliente_id_uidx
  on public.responsaveis_internos (cliente_id);

comment on index public.responsaveis_internos_cliente_id_uidx is
  'Permite upsert/onConflict(cliente_id) no app — um registro de responsáveis por cliente.';
