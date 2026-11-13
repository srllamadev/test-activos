-- Crear tabla users para el backend FastAPI
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR NOT NULL UNIQUE,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Tabla para tracking de migraciones de Alembic
CREATE TABLE IF NOT EXISTS public.alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Insertar versión inicial
INSERT INTO public.alembic_version (version_num) VALUES ('000000000001')
ON CONFLICT DO NOTHING;

-- Habilitar RLS para la tabla users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: los usuarios pueden ver sus propios datos
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Política: los usuarios pueden actualizar sus propios datos
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- El service_role puede hacer todo (para el backend)
DROP POLICY IF EXISTS "Service role has full access" ON public.users;
CREATE POLICY "Service role has full access" ON public.users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
