import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "editor" | "viewer";

export interface AuthContext {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  timeZone: string;
  role: Role;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Consulta",
};

export function canEdit(role: Role): boolean {
  return role === "admin" || role === "editor";
}

export function isAdmin(role: Role): boolean {
  return role === "admin";
}

/**
 * Contexto de autenticación para la petición actual.
 * Redirige a /login si no hay sesión válida; si el usuario no pertenece a
 * ninguna organización, muestra la pantalla de acceso pendiente.
 */
export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    redirect("/login");
  }

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("role, created_at, organizations(id, name, time_zone)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("No se pudo cargar la membresía de la organización.");
  }

  const first = memberships?.[0];
  const org = first?.organizations as unknown as { id: string; name: string; time_zone: string } | null;
  if (!first || !org) {
    redirect("/acceso-pendiente");
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    organizationId: org.id,
    organizationName: org.name,
    timeZone: org.time_zone,
    role: first.role as Role,
  };
});

/** Solo para acciones que exigen permisos de escritura. Lanza error si no aplica. */
export async function requireEditor(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!canEdit(ctx.role)) {
    throw new Error("Tu rol de consulta no permite modificar la información.");
  }
  return ctx;
}

/** Solo para acciones administrativas. */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!isAdmin(ctx.role)) {
    throw new Error("Esta acción requiere rol de administrador.");
  }
  return ctx;
}
