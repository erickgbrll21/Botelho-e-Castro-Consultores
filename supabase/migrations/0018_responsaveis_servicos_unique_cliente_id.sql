-- 0018_responsaveis_servicos_unique_cliente_id.sql
-- O PostgREST precisa de UNIQUE (ou índice de exclusão) em cliente_id para upsert ON CONFLICT.
-- Sem isso: "there is no unique or exclusion constraint matching the ON CONFLICT specification".

-- servicos_contratados: no máximo uma linha por cliente (mantém o maior id por cliente_id)
delete from public.servicos_contratados s
where s.id not in (
  select max(s2.id)
  from public.servicos_contratados s2
  group by s2.cliente_id
);

create unique index if not exists servicos_contratados_cliente_id_uidx
  on public.servicos_contratados (cliente_id);

comment on index public.servicos_contratados_cliente_id_uidx is
  'Permite upsert/onConflict(cliente_id) no app — um registro de serviços por cliente.';

-- responsaveis_internos: no máximo uma linha por cliente (mantém o maior id por cliente_id)
delete from public.responsaveis_internos r
where r.id not in (
  select max(r2.id)
  from public.responsaveis_internos r2
  group by r2.cliente_id
);

create unique index if not exists responsaveis_internos_cliente_id_uidx
  on public.responsaveis_internos (cliente_id);

comment on index public.responsaveis_internos_cliente_id_uidx is
  'Permite upsert/onConflict(cliente_id) no app — um registro de responsáveis por cliente.';
