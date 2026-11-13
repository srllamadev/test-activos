-- Migración: Crear tabla users para el backend FastAPI
-- Ejecutar en Supabase SQL Editor

-- Tabla users (si no existe, crearla)
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        CREATE TABLE users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR NOT NULL UNIQUE,
            hashed_password VARCHAR NOT NULL,
            full_name VARCHAR,
            is_active BOOLEAN DEFAULT TRUE,
            is_superuser BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX idx_users_email ON users(email);
    END IF;
END $$;

-- Tabla alembic_version para tracking de migraciones
DO $$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alembic_version') THEN
        CREATE TABLE alembic_version (
            version_num VARCHAR(32) NOT NULL,
            CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
        );
    END IF;
END $$;

-- Insertar versión inicial
INSERT INTO alembic_version (version_num) VALUES ('000000000001')
ON CONFLICT DO NOTHING;
