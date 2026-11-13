/**
 * Crea la primera organización y su administrador.
 *
 * Uso (desde tu equipo, con las variables en el entorno, nunca en el repositorio):
 *   ORG_NAME="Mi entidad" ADMIN_EMAIL="admin@entidad.gob" npx tsx scripts/bootstrap-admin.ts
 *
 * Variables:
 *   NEXT_PUBLIC_SUPABASE_URL      URL del proyecto Supabase
 *   SUPABASE_SERVICE_ROLE_KEY     clave de servicio (solo en tu equipo o en un entorno seguro)
 *   ORG_NAME                      nombre de la entidad
 *   ADMIN_EMAIL                   correo del primer administrador
 *   ADMIN_PASSWORD (opcional)     si no se indica, se genera una contraseña temporal aleatoria
 *
 * El script es idempotente por correo: si el usuario ya existe, solo asegura la membresía.
 * Tras el primer inicio de sesión, el administrador debe cambiar la contraseña.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable ${name}.`);
  return v;
}

async function main() {
  const url = need("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");
  const orgName = need("ORG_NAME");
  const email = need("ADMIN_EMAIL").trim().toLowerCase();

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1. Organización (reutiliza una existente con el mismo nombre)
  let orgId: string;
  const { data: existingOrg } = await supabase.from("organizations").select("id").eq("name", orgName).maybeSingle();
  if (existingOrg) {
    orgId = existingOrg.id;
    console.log(`Organización existente reutilizada: ${orgId}`);
  } else {
    const { data, error } = await supabase.from("organizations").insert({ name: orgName }).select("id").single();
    if (error) throw error;
    orgId = data.id;
    console.log(`Organización creada: ${orgId}`);
  }

  // 2. Usuario (crea la cuenta si no existe)
  let userId: string | undefined;
  let generatedPassword: string | undefined;
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const found = list.users.find((u) => u.email?.toLowerCase() === email);
  if (found) {
    userId = found.id;
    console.log("El usuario ya existe; se asegurará su membresía de administrador.");
  } else {
    const password = process.env.ADMIN_PASSWORD ?? randomBytes(18).toString("base64url");
    generatedPassword = process.env.ADMIN_PASSWORD ? undefined : password;
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("Usuario creado.");
  }

  // 3. Perfil y membresía de administrador
  await supabase.from("profiles").upsert({ id: userId, email }, { onConflict: "id" });
  const { error: memberError } = await supabase
    .from("organization_members")
    .upsert({ organization_id: orgId, user_id: userId, role: "admin" }, { onConflict: "organization_id,user_id" });
  if (memberError) throw memberError;

  console.log(`Administrador asignado a «${orgName}».`);
  if (generatedPassword) {
    console.log("\nContraseña temporal generada (se muestra una sola vez):");
    console.log(generatedPassword);
    console.log("Cámbiala al iniciar sesión (Recuperar contraseña).");
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
