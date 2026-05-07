-- 0015_logs_sistema_usuario_on_delete_set_null.sql
-- Permite excluir usuários preservando logs (seta usuario_id = NULL).

alter table public.logs_sistema
  drop constraint if exists logs_sistema_usuario_id_fkey;

alter table public.logs_sistema
  add constraint logs_sistema_usuario_id_fkey
  foreign key (usuario_id)
  references public.usuarios(id)
  on delete set null;

