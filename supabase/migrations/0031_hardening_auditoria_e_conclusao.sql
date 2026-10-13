-- Endurecimento de segurança:
-- 1) Responsável (não gestor) não pode alterar concluida_em/concluida_por nem
--    tirar uma demanda do status 'concluida' (evita expurgo antecipado e
--    falsificação de quem confirmou).
-- 2) logs_sistema e historico_demandas: autor e data são definidos pelo banco
--    em inserts feitos com sessão de usuário (não confia no que o cliente envia).

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
     or new.email_respondido is distinct from old.email_respondido
     or new.concluida_em is distinct from old.concluida_em
     or new.concluida_por is distinct from old.concluida_por
     or new.created_at is distinct from old.created_at then
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

  if old.status = 'concluida'::public.demanda_status
     and new.status is distinct from old.status then
    raise exception
      'Somente o gestor pode reabrir uma demanda confirmada.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.forcar_autor_registro()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select u.nome into v_nome from public.usuarios u where u.id = auth.uid();

  new.usuario_id := auth.uid();
  new.usuario_nome := coalesce(v_nome, new.usuario_nome);
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.forcar_autor_registro() from public;

drop trigger if exists logs_sistema_forcar_autor on public.logs_sistema;
create trigger logs_sistema_forcar_autor
  before insert on public.logs_sistema
  for each row execute function public.forcar_autor_registro();

drop trigger if exists historico_demandas_forcar_autor on public.historico_demandas;
create trigger historico_demandas_forcar_autor
  before insert on public.historico_demandas
  for each row execute function public.forcar_autor_registro();
