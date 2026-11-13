-- Migrar foreign keys de auth.users a public.users

-- Limpiar datos huérfanos (referencias a auth.users que no existen en public.users)
DELETE FROM public.organization_members 
WHERE user_id NOT IN (SELECT id FROM public.users);

DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM public.users);

-- Eliminar constraint existente en organization_members
ALTER TABLE public.organization_members 
DROP CONSTRAINT IF EXISTS organization_members_user_id_fkey;

-- Agregar nueva constraint apuntando a public.users
ALTER TABLE public.organization_members
ADD CONSTRAINT organization_members_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Eliminar constraint en profiles si existe
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Agregar constraint a public.users
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey 
FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;
