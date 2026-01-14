## Botelho e Castro Consultores — Dashboard Interno

Aplicação Next.js + Tailwind focada em segurança e RBAC com Supabase Auth e policies (RLS). Somente administradores criam usuários e clientes. Nenhum dado é exibido sem autenticação.

### Como rodar localmente

```bash
cd web
cp env.example .env.local # ajuste as variáveis
npm install
npm run dev
```

### Variáveis obrigatórias

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (somente no servidor, para criar usuários)
- `DATABASE_URL` (opcional, conexão direta para ferramentas de migração)

### Banco e RLS no Supabase

1) Aplique o SQL em `supabase/migrations/0001_init.sql` via SQL Editor ou CLI.
2) Desabilite auto-cadastro (Email signup) no Auth; só admins criam contas.
3) Crie usuários via service role (painel `/usuarios` usa esta chave).

### Rotas principais

- `/login` — acesso com e-mail/senha criado por administrador.
- `/dashboard` — cards, busca e tabela de empresas com responsabilidades e serviços.
- `/empresas/[id]` — detalhes da empresa, quadro societário e responsáveis.
- `/usuarios` — gestão de usuários (apenas admin; requer `SUPABASE_SERVICE_ROLE_KEY`).

### Segurança

- RLS cobrindo todas as tabelas: admins têm controle total; usuários só leem empresas às quais foram atribuídos via `empresa_usuarios`.
- `middleware.ts` protege todas as rotas e redireciona não autenticados.
- Service role nunca exposto ao cliente; usado apenas em server actions.
