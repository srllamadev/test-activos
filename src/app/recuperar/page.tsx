import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { RecoverForm } from "@/features/auth/recover-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function RecoverPage() {
  return (
    <AuthShell title="Recuperar contraseña" description="Te enviaremos un enlace para crear una nueva contraseña.">
      <RecoverForm />
      <a href="/login" className="link link-hover text-center text-sm font-medium text-primary">
        Volver al inicio de sesión
      </a>
    </AuthShell>
  );
}
