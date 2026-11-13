import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPage() {
  return (
    <AuthShell title="Nueva contraseña" description="Mínimo 12 caracteres, con letras y números.">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
