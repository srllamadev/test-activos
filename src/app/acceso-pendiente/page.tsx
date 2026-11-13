import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { signOutAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Acceso pendiente" };

export default function PendingPage() {
  return (
    <AuthShell title="Acceso pendiente" description="Tu cuenta no está asociada a ninguna organización.">
      <p className="text-sm">
        Solicita a un administrador de tu entidad que te asigne a la organización correspondiente.
      </p>
      <form action={signOutAction}>
        <button type="submit" className="btn btn-outline btn-block">
          Cerrar sesión
        </button>
      </form>
    </AuthShell>
  );
}
