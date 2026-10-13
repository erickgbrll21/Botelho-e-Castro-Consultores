-- Registro de tentativas de login com falha, para bloqueio por força bruta.
-- Acesso apenas pela service role (RLS ligada e sem policies).

create table if not exists public.login_tentativas (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists login_tentativas_email_idx
  on public.login_tentativas (email, created_at desc);
create index if not exists login_tentativas_ip_idx
  on public.login_tentativas (ip, created_at desc);

alter table public.login_tentativas enable row level security;
revoke all on public.login_tentativas from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin
      perform cron.unschedule('limpar-login-tentativas');
    exception
      when others then
        null;
    end;
    perform cron.schedule(
      'limpar-login-tentativas',
      '30 3 * * *',
      $cmd$delete from public.login_tentativas where created_at < now() - interval '1 day'$cmd$
    );
  end if;
exception
  when others then
    null;
end $$;
