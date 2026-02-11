-- Habilita RLS na tabela de logs
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

-- Remove a política excessivamente permissiva mencionada no issue
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.logs_sistema;

-- Cria uma nova política para inserção restrita a usuários autenticados
-- Garante que o usuário só pode inserir logs associados ao seu próprio ID de autenticação
CREATE POLICY "Usuários podem inserir seus próprios logs"
ON public.logs_sistema
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = usuario_id);

-- Cria uma política para leitura (SELECT) apenas para perfis autorizados (admin, diretor, financeiro)
CREATE POLICY "Apenas perfis autorizados podem visualizar logs"
ON public.logs_sistema
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE usuarios.id = auth.uid()
    AND usuarios.tipo_usuario IN ('admin', 'diretor', 'financeiro')
  )
);
