-- Endereço: CEP e campos preenchíveis via ViaCEP
alter table public.clientes add column if not exists cep text;
alter table public.clientes add column if not exists logradouro text;
alter table public.clientes add column if not exists bairro text;
alter table public.clientes add column if not exists complemento text;
