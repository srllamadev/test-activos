import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "./server";

/**
 * Cliente con clave de servicio (bypass de RLS).
 * SOLO para scripts de arranque en el servidor. Nunca importar desde componentes cliente
 * ni exponer SUPABASE_SERVICE_ROLE_KEY al navegador.
 */
export function createAdminClient() {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
