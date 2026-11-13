import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getAuthToken, getCurrentUser, getMyOrganizations } from "@/features/auth/actions";

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
  const token = await getAuthToken();
  if (!token) {
    redirect("/login");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const organizations = await getMyOrganizations();
  if (!organizations || organizations.length === 0) {
    redirect("/acceso-pendiente");
  }

  const firstOrg = organizations[0];

  return {
    userId: user.id,
    email: user.email,
    organizationId: firstOrg.id,
    organizationName: firstOrg.name,
    timeZone: "America/Bogota",
    role: firstOrg.role as Role,
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
