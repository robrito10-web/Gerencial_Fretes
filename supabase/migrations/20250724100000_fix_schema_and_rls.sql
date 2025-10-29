/*
# [Correção Crítica de Schema e RLS]
Esta migração corrige dois problemas críticos:
1. Adiciona a coluna `admin_vinculado` que faltava na tabela `profiles`, necessária para vincular motoristas aos seus administradores.
2. Substitui todas as políticas de segurança de nível de linha (RLS) existentes na tabela `profiles` por um conjunto de regras seguro e não recursivo para corrigir um erro de "recursão infinita".

## Descrição da Query: Esta operação irá primeiro alterar a tabela `profiles` para adicionar uma nova coluna e uma chave estrangeira. Em seguida, substituirá completamente as políticas de segurança para essa tabela. Os dados existentes serão preservados, mas as regras de acesso mudarão. É seguro executar, mas backups são sempre recomendados antes de alterações de esquema.

## Metadados:
- Categoria do Schema: ["Estrutural", "Segurança"]
- Nível de Impacto: ["Alto"]
- Requer Backup: true
- Reversível: false (sem as definições da política antiga)

## Detalhes da Estrutura:
- **Tabela Modificada:** `public.profiles`
- **Coluna Adicionada:** `admin_vinculado` (UUID)
- **Restrição Adicionada:** Chave estrangeira de `admin_vinculado` para `public.profiles(id)`.

## Implicações de Segurança:
- Status do RLS: Habilitado
- Mudanças na Política: Sim. Todas as políticas em `public.profiles` serão descartadas e recriadas. Isso corrige um bug crítico de recursão e define regras de acesso claras para os perfis 'dev', 'admin' e 'motorista'.
*/

-- PASSO 1: Corrigir o schema da tabela adicionando a coluna e a restrição ausentes.
-- Adiciona a coluna se ela não existir.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_vinculado UUID;

-- Remove a restrição se ela existir e a adiciona novamente. Isso torna o script re-executável.
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_admin_vinculado_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_admin_vinculado_fkey
FOREIGN KEY (admin_vinculado) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- PASSO 2: Corrigir as políticas de Segurança de Nível de Linha (RLS) para evitar recursão.

-- Remove todas as políticas existentes na tabela de perfis para garantir um estado limpo.
DROP POLICY IF EXISTS "Allow individual read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow admin read access to their users" ON public.profiles;
DROP POLICY IF EXISTS "Allow dev read access" ON public.profiles;
DROP POLICY IF EXISTS "Allow read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can see their drivers" ON public.profiles;
DROP POLICY IF EXISTS "Drivers can see their admin" ON public.profiles;
DROP POLICY IF EXISTS "Devs can see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update their drivers" ON public.profiles;
DROP POLICY IF EXISTS "Admins can invite users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access based on role" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable update based on role" ON public.profiles;
DROP POLICY IF EXISTS "Enable delete based on role" ON public.profiles;


-- Função auxiliar para obter o perfil do usuário atualmente autenticado.
-- SECURITY DEFINER permite que ela ignore as políticas RLS do usuário chamador, evitando recursão.
CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS TABLE(id uuid, perfil text, admin_vinculado uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, perfil, admin_vinculado FROM profiles WHERE id = auth.uid();
$$;


-- NOVAS POLÍTICAS RLS

-- 1. Política de SELECT (LEITURA):
-- Combina todas as regras de leitura em uma única política permissiva.
CREATE POLICY "Enable read access based on role" ON public.profiles
FOR SELECT
USING (
  -- Regra A: Usuários podem ver seu próprio perfil.
  id = auth.uid()
  OR
  -- Regra B: Administradores podem ver os perfis de seus motoristas.
  admin_vinculado = auth.uid()
  OR
  -- Regra C: Motoristas podem ver o perfil de seu administrador.
  id = (SELECT p.admin_vinculado FROM get_my_profile() p)
  OR
  -- Regra D: Desenvolvedores ('dev') podem ver todos os perfis.
  (SELECT p.perfil FROM get_my_profile() p) = 'dev'
);

-- 2. Política de INSERT (CRIAÇÃO):
-- O gatilho `on_auth_user_created` já lida com a inserção automática do perfil do usuário.
-- Esta política permite que administradores criem perfis ao convidar usuários.
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
FOR INSERT
WITH CHECK (
  -- Um perfil pode ser criado se seu ID corresponder ao do usuário autenticado.
  id = auth.uid()
  OR
  -- Um administrador pode criar um perfil (ao convidar um motorista).
  (SELECT p.perfil FROM get_my_profile() p) = 'admin'
);


-- 3. Política de UPDATE (MODIFICAÇÃO):
CREATE POLICY "Enable update based on role" ON public.profiles
FOR UPDATE
USING (
  -- Regra A: Usuários podem atualizar seu próprio perfil.
  id = auth.uid()
  OR
  -- Regra B: Administradores podem atualizar os perfis de seus motoristas.
  admin_vinculado = auth.uid()
  OR
  -- Regra C: Desenvolvedores podem atualizar qualquer perfil.
  (SELECT p.perfil FROM get_my_profile() p) = 'dev'
)
WITH CHECK (
  -- As mesmas regras se aplicam aos dados resultantes.
  id = auth.uid()
  OR
  admin_vinculado = auth.uid()
  OR
  (SELECT p.perfil FROM get_my_profile() p) = 'dev'
);


-- 4. Política de DELETE:
-- Permite que usuários excluam sua própria conta e administradores excluam seus motoristas.
CREATE POLICY "Enable delete based on role" ON public.profiles
FOR DELETE
USING (
  -- Regra A: Usuários podem excluir seu próprio perfil.
  id = auth.uid()
  OR
  -- Regra B: Administradores podem excluir seus motoristas.
  admin_vinculado = auth.uid()
  OR
  -- Regra C: Desenvolvedores podem excluir qualquer pessoa.
  (SELECT p.perfil FROM get_my_profile() p) = 'dev'
);

-- Garante que o RLS esteja habilitado na tabela.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
