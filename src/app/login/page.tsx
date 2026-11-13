import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { LoginForm } from "@/features/auth/login-form";

// Contenido privado por usuario: se renderiza en el servidor en cada petición.
export const instant = false;

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "/";
  const linkError = params.error === "enlace";

  return (
    <AuthShell title="Iniciar sesión" description="Accede con la cuenta asignada por tu administrador.">
      {linkError && (
        <div role="alert" className="alert alert-warning text-sm">
          El enlace no es válido o expiró. Solicita uno nuevo.
        </div>
      )}
      <LoginForm next={next} />
      <a href="/recuperar" className="link link-hover text-center text-sm font-medium text-primary">
        ¿Olvidaste tu contraseña?
      </a>
      <p className="text-center text-xs text-primary/70">
        No hay registro público. Las cuentas son creadas o invitadas por un administrador.
      </p>
    </AuthShell>
  );
}
