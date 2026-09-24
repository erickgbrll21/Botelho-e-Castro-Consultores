-- E-mail respondido na Demanda Cível (sim, não ou em branco).

alter table public.demandas
  add column if not exists email_respondido boolean;

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
  d.cnpj,
  d.empresa_nome,
  d.empresa_fantasia,
  d.empresa_situacao,
  d.empresa_cidade,
  d.empresa_uf,
  d.setor,
  d.parte_contraria,
  d.numero_processo,
  d.tratado,
  d.email_respondido,
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
     or new.caminho_pasta is distinct from old.caminho_pasta
     or new.cnpj is distinct from old.cnpj
     or new.empresa_nome is distinct from old.empresa_nome
     or new.empresa_fantasia is distinct from old.empresa_fantasia
     or new.empresa_situacao is distinct from old.empresa_situacao
     or new.empresa_cidade is distinct from old.empresa_cidade
     or new.empresa_uf is distinct from old.empresa_uf
     or new.setor is distinct from old.setor
     or new.parte_contraria is distinct from old.parte_contraria
     or new.numero_processo is distinct from old.numero_processo
     or new.tratado is distinct from old.tratado
     or new.email_respondido is distinct from old.email_respondido then
    raise exception
      'Usuário responsável pode alterar apenas status, protocolo e observações.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status = 'concluida'::public.demanda_status then
    raise exception
      'A confirmação final da demanda é exclusiva do gestor.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;
