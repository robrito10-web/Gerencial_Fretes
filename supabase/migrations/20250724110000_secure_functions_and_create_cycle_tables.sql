/*
          # [Structural] Criação de Tabelas do Ciclo e Correção de Segurança
          Cria as tabelas restantes para o gerenciamento completo dos ciclos de viagem (fretes, abastecimentos, despesas, etc.) e corrige uma vulnerabilidade de segurança nas funções existentes.

          ## Query Description: Este script adiciona novas tabelas essenciais para a funcionalidade principal da aplicação e ajusta funções existentes para serem mais seguras. A operação é segura e não afeta dados existentes nas tabelas `profiles`, `cars` ou `tire_brands`.
          
          ## Metadata:
          - Schema-Category: "Structural"
          - Impact-Level: "Low"
          - Requires-Backup: false
          - Reversible: false
          
          ## Structure Details:
          - Cria as tabelas: `cycles`, `freights`, `fuelings`, `expenses`, `tire_changes`, `driver_permissions`, `settings`.
          - Adiciona colunas, chaves primárias, chaves estrangeiras e políticas de RLS para as novas tabelas.
          - Altera as funções `get_my_profile()` e `get_my_admin_id()` para definir um `search_path` seguro.
          
          ## Security Implications:
          - RLS Status: Habilitado para todas as novas tabelas.
          - Policy Changes: Novas políticas são criadas para as novas tabelas.
          - Auth Requirements: As políticas dependem do `auth.uid()` do usuário autenticado.
          
          ## Performance Impact:
          - Indexes: Índices são criados automaticamente para chaves primárias e estrangeiras.
          - Triggers: Nenhum.
          - Estimated Impact: Baixo. A criação de tabelas é uma operação rápida.
          */

-- 1. Corrigir a vulnerabilidade de segurança nas funções existentes
ALTER FUNCTION public.get_my_profile() SET search_path = public;
ALTER FUNCTION public.get_my_admin_id() SET search_path = public;

-- 2. Tabela de Ciclos
CREATE TABLE IF NOT EXISTS public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    car_id UUID REFERENCES public.cars(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    data_saida DATE NOT NULL,
    km_saida NUMERIC NOT NULL,
    km_saida_photo_url TEXT,
    data_chegada DATE,
    km_chegada NUMERIC,
    km_chegada_photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'aberto' -- 'aberto', 'fechado'
);
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar seus próprios ciclos" ON public.cycles
    FOR ALL USING (public.get_my_admin_id() = admin_id);

-- 3. Tabela de Fretes
CREATE TABLE IF NOT EXISTS public.freights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    peso_saida NUMERIC,
    peso_chegada NUMERIC,
    valor_perda NUMERIC,
    valor_comissao NUMERIC,
    departure_photo_url TEXT,
    arrival_photo_url TEXT
);
ALTER TABLE public.freights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar fretes de seus ciclos" ON public.freights
    FOR ALL USING (
        cycle_id IN (SELECT id FROM public.cycles WHERE public.get_my_admin_id() = cycles.admin_id)
    );

-- 4. Tabela de Abastecimentos
CREATE TABLE IF NOT EXISTS public.fuelings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    litros NUMERIC NOT NULL,
    valor_litro NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    km NUMERIC NOT NULL,
    km_photo_url TEXT,
    receipt_photo_url TEXT
);
ALTER TABLE public.fuelings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar abastecimentos de seus ciclos" ON public.fuelings
    FOR ALL USING (
        cycle_id IN (SELECT id FROM public.cycles WHERE public.get_my_admin_id() = cycles.admin_id)
    );

-- 5. Tabela de Despesas
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    cycle_id UUID REFERENCES public.cycles(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC NOT NULL,
    receipt_photo_url TEXT
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar despesas de seus ciclos" ON public.expenses
    FOR ALL USING (
        cycle_id IN (SELECT id FROM public.cycles WHERE public.get_my_admin_id() = cycles.admin_id)
    );

-- 6. Tabela de Trocas de Pneu
CREATE TABLE IF NOT EXISTS public.tire_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    car_id UUID REFERENCES public.cars(id) ON DELETE CASCADE NOT NULL,
    data DATE NOT NULL,
    posicao TEXT NOT NULL,
    marca_antiga_id UUID REFERENCES public.tire_brands(id),
    marca_nova_id UUID REFERENCES public.tire_brands(id),
    motivo TEXT
);
ALTER TABLE public.tire_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem gerenciar trocas de pneus de seus carros" ON public.tire_changes
    FOR ALL USING (public.get_my_admin_id() = admin_id);

-- 7. Tabela de Permissões de Motorista
CREATE TABLE IF NOT EXISTS public.driver_permissions (
    driver_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    view_tire_changes BOOLEAN DEFAULT TRUE,
    view_fuelings BOOLEAN DEFAULT TRUE,
    view_expenses BOOLEAN DEFAULT TRUE
);
ALTER TABLE public.driver_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem gerenciar permissões de seus motoristas" ON public.driver_permissions
    FOR ALL USING (public.get_my_admin_id() = (SELECT admin_vinculado FROM public.profiles WHERE id = driver_id));
CREATE POLICY "Motoristas podem ver suas próprias permissões" ON public.driver_permissions
    FOR SELECT USING (auth.uid() = driver_id);

-- 8. Tabela de Configurações
CREATE TABLE IF NOT EXISTS public.settings (
    admin_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    commission_percentage NUMERIC DEFAULT 10
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins podem gerenciar suas próprias configurações" ON public.settings
    FOR ALL USING (auth.uid() = admin_id);
