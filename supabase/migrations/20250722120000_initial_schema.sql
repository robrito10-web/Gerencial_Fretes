/*
# [SETUP INICIAL DO BANCO DE DADOS]
Este script configura a estrutura completa do banco de dados para a aplicação Gerencial Fretes.

## Query Description: 
Este script é seguro para ser executado em um projeto Supabase novo. Ele criará todas as tabelas, funções, políticas de segurança (RLS) e buckets de armazenamento necessários para o funcionamento da aplicação. Nenhuma informação existente será perdida, pois ele foi projetado para a configuração inicial.

## Metadata:
- Schema-Category: "Structural"
- Impact-Level: "Low"
- Requires-Backup: false
- Reversible: false

## Structure Details:
- Tabelas: profiles, cars, tire_brands, tire_changes, cycles, freights, fuelings, expenses.
- Funções: handle_new_user (para criação automática de perfil).
- Triggers: on_auth_user_created (para acionar a função handle_new_user).
- Policies: Políticas de RLS para todas as tabelas, garantindo a segregação de dados.
- Storage: Buckets para 'cycle_photos', 'freight_photos', 'fueling_photos', 'expense_photos'.

## Security Implications:
- RLS Status: Habilitado em todas as tabelas.
- Policy Changes: Sim, políticas são criadas para garantir que os usuários só acessem seus próprios dados.
- Auth Requirements: As políticas utilizam o ID do usuário autenticado (auth.uid()).

## Performance Impact:
- Indexes: Índices são criados automaticamente para chaves primárias e estrangeiras.
- Triggers: Um trigger é adicionado para sincronizar perfis de usuário. O impacto é mínimo.
- Estimated Impact: Baixo, otimizado para as operações da aplicação.
*/

-- EXTENSIONS (Opcional, mas recomendado)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS DE USUÁRIO (PROFILES)
-- Armazena dados públicos dos usuários, vinculados à tabela auth.users.
CREATE TABLE public.profiles (
    id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefone TEXT,
    perfil TEXT NOT NULL CHECK (perfil IN ('admin', 'motorista')),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    commission_percentage NUMERIC(5, 2) DEFAULT 10.00,
    perm_view_tire_changes BOOLEAN DEFAULT TRUE,
    perm_view_fuelings BOOLEAN DEFAULT TRUE,
    perm_view_expenses BOOLEAN DEFAULT TRUE,
    CONSTRAINT admin_id_check CHECK (
        (perfil = 'admin' AND admin_id IS NULL) OR 
        (perfil = 'motorista' AND admin_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.profiles IS 'Armazena informações de perfil para cada usuário.';
COMMENT ON COLUMN public.profiles.id IS 'Referência ao ID do usuário em auth.users.';
COMMENT ON COLUMN public.profiles.perfil IS 'Define o tipo de usuário: admin ou motorista.';
COMMENT ON COLUMN public.profiles.admin_id IS 'Para motoristas, armazena o ID do admin vinculado.';
COMMENT ON COLUMN public.profiles.commission_percentage IS 'Percentual de comissão, aplicável apenas a admins.';

-- 2. FUNÇÃO PARA CRIAR PERFIL AUTOMATICAMENTE
-- Esta função é chamada por um trigger sempre que um novo usuário é criado na tabela auth.users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, nome, email, perfil, admin_id)
    VALUES (
        new.id,
        new.raw_user_meta_data->>'nome',
        new.email,
        new.raw_user_meta_data->>'perfil',
        (new.raw_user_meta_data->>'admin_id')::UUID
    );
    RETURN new;
END;
$$;

-- 3. TRIGGER PARA A FUNÇÃO handle_new_user
-- Aciona a função handle_new_user após a inserção de um novo usuário.
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. TABELA DE CARROS (CARS)
CREATE TABLE public.cars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    placa TEXT NOT NULL,
    marca TEXT NOT NULL,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.cars IS 'Armazena os carros cadastrados por cada administrador.';

-- 5. TABELA DE MARCAS DE PNEU (TIRE_BRANDS)
CREATE TABLE public.tire_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name TEXT NOT NULL UNIQUE
);
COMMENT ON TABLE public.tire_brands IS 'Lista global de marcas de pneu.';

-- 6. TABELA DE TROCAS DE PNEU (TIRE_CHANGES)
CREATE TABLE public.tire_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES public.tire_brands(id) ON DELETE RESTRICT,
    posicao TEXT NOT NULL,
    km_atual NUMERIC NOT NULL,
    data_troca DATE NOT NULL,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.tire_changes IS 'Registros de trocas de pneu.';

-- 7. TABELA DE CICLOS (CYCLES)
CREATE TABLE public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    descricao TEXT NOT NULL,
    driver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    car_id UUID NOT NULL REFERENCES public.cars(id) ON DELETE RESTRICT,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    data_saida DATE NOT NULL,
    km_saida NUMERIC NOT NULL,
    km_saida_photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado'))
);
COMMENT ON TABLE public.cycles IS 'Ciclos de viagem/frete.';

-- 8. TABELA DE FRETES (FREIGHTS)
CREATE TABLE public.freights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    origem TEXT NOT NULL,
    destino TEXT NOT NULL,
    frete_por_tonelada NUMERIC(10, 2) NOT NULL,
    peso_saida NUMERIC(10, 2) NOT NULL,
    peso_chegada NUMERIC(10, 2),
    valor_perda NUMERIC(10, 2) DEFAULT 0,
    valor NUMERIC(10, 2) NOT NULL,
    valor_comissao NUMERIC(10, 2) NOT NULL,
    departure_photo_url TEXT,
    arrival_photo_url TEXT
);
COMMENT ON TABLE public.freights IS 'Registros de fretes dentro de um ciclo.';

-- 9. TABELA DE ABASTECIMENTOS (FUELINGS)
CREATE TABLE public.fuelings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    posto TEXT NOT NULL,
    quilometragem NUMERIC NOT NULL,
    qtd_litros_arla NUMERIC(10, 4),
    valor_litro_arla NUMERIC(10, 4),
    qtd_litros_s10 NUMERIC(10, 4),
    valor_litro_s10 NUMERIC(10, 4),
    total NUMERIC(10, 2) NOT NULL,
    km_photo_url TEXT,
    receipt_photo_url TEXT
);
COMMENT ON TABLE public.fuelings IS 'Registros de abastecimento dentro de um ciclo.';

-- 10. TABELA DE DESPESAS (EXPENSES)
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    receipt_photo_url TEXT
);
COMMENT ON TABLE public.expenses IS 'Registros de despesas diversas dentro de um ciclo.';


-- 11. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tire_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuelings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 12. POLÍTICAS DE RLS
-- Profiles: Usuários podem ver seus próprios perfis. Admins podem ver os perfis de seus motoristas.
CREATE POLICY "Users can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view their drivers profiles." ON public.profiles FOR SELECT USING (id IN (SELECT id FROM public.profiles WHERE admin_id = auth.uid()));
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Cars: Admins podem gerenciar (CRUD) seus próprios carros.
CREATE POLICY "Admins can manage their own cars." ON public.cars FOR ALL USING (auth.uid() = admin_id);

-- Tire Brands: Todos podem visualizar. Apenas `service_role` pode modificar.
CREATE POLICY "Allow read access to everyone" ON public.tire_brands FOR SELECT USING (true);

-- Tire Changes: Admins podem gerenciar suas próprias trocas.
CREATE POLICY "Admins can manage their own tire changes." ON public.tire_changes FOR ALL USING (auth.uid() = admin_id);

-- Cycles: Admins podem gerenciar seus ciclos. Motoristas podem ver os ciclos a eles atribuídos.
CREATE POLICY "Admins can manage their cycles." ON public.cycles FOR ALL USING (auth.uid() = admin_id);
CREATE POLICY "Drivers can view their own cycles." ON public.cycles FOR SELECT USING (auth.uid() = driver_id);

-- Freights, Fuelings, Expenses: Admins gerenciam. Motoristas podem gerenciar se o ciclo estiver aberto.
CREATE POLICY "Users can manage records in their own cycles." ON public.freights FOR ALL
    USING (
        (SELECT admin_id FROM public.cycles WHERE id = cycle_id) = auth.uid() OR
        (
            (SELECT driver_id FROM public.cycles WHERE id = cycle_id) = auth.uid() AND
            (SELECT status FROM public.cycles WHERE id = cycle_id) = 'aberto'
        )
    );
CREATE POLICY "Users can manage records in their own cycles." ON public.fuelings FOR ALL
    USING (
        (SELECT admin_id FROM public.cycles WHERE id = cycle_id) = auth.uid() OR
        (
            (SELECT driver_id FROM public.cycles WHERE id = cycle_id) = auth.uid() AND
            (SELECT status FROM public.cycles WHERE id = cycle_id) = 'aberto'
        )
    );
CREATE POLICY "Users can manage records in their own cycles." ON public.expenses FOR ALL
    USING (
        (SELECT admin_id FROM public.cycles WHERE id = cycle_id) = auth.uid() OR
        (
            (SELECT driver_id FROM public.cycles WHERE id = cycle_id) = auth.uid() AND
            (SELECT status FROM public.cycles WHERE id = cycle_id) = 'aberto'
        )
    );

-- 13. BUCKETS DE ARMAZENAMENTO (STORAGE)
INSERT INTO storage.buckets (id, name, public) VALUES
    ('cycle_photos', 'cycle_photos', false),
    ('freight_photos', 'freight_photos', false),
    ('fueling_photos', 'fueling_photos', false),
    ('expense_photos', 'expense_photos', false)
ON CONFLICT (id) DO NOTHING;

-- POLÍTICAS DE ACESSO AOS BUCKETS
CREATE POLICY "Cycle photos access" ON storage.objects FOR ALL
    USING (bucket_id = 'cycle_photos' AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.profiles WHERE admin_id = auth.uid() OR id = auth.uid()
    ));

CREATE POLICY "Freight photos access" ON storage.objects FOR ALL
    USING (bucket_id = 'freight_photos' AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.profiles WHERE admin_id = auth.uid() OR id = auth.uid()
    ));

CREATE POLICY "Fueling photos access" ON storage.objects FOR ALL
    USING (bucket_id = 'fueling_photos' AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.profiles WHERE admin_id = auth.uid() OR id = auth.uid()
    ));

CREATE POLICY "Expense photos access" ON storage.objects FOR ALL
    USING (bucket_id = 'expense_photos' AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.profiles WHERE admin_id = auth.uid() OR id = auth.uid()
    ));
