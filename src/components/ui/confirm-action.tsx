"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";

interface Props {
  /** Acción de servidor que devuelve { ok, message }. */
  action: () => Promise<{ ok: boolean; message: string }>;
  buttonLabel: string;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "default" | "danger";
  icon?: ReactNode;
  /** Ruta a la que navegar tras una acción exitosa (opcional). */
  redirectTo?: string;
  /** Abre el diálogo al montar (por ejemplo, desde un enlace con ?accion=archivar). */
  openOnMount?: boolean;
  disabled?: boolean;
}

/** Acción sensible con confirmación explícita. Accesible: el diálogo nativo gestiona el foco y Esc. */
export function ConfirmAction({
  action,
  buttonLabel,
  title,
  description,
  confirmLabel,
  variant = "default",
  icon,
  redirectTo,
  openOnMount,
  disabled,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (openOnMount) dialogRef.current?.showModal();
  }, [openOnMount]);

  function confirm() {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.ok, text: result.message });
      if (result.ok) {
        dialogRef.current?.close();
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className={`btn ${variant === "danger" ? "btn-outline btn-error" : "btn-outline"}`}
        onClick={() => {
          setMessage(null);
          dialogRef.current?.showModal();
        }}
        disabled={disabled}
      >
        {icon}
        {buttonLabel}
      </button>

      <dialog ref={dialogRef} className="modal" aria-labelledby="confirm-title">
        <div className="modal-box bg-base-100">
          <h3 id="confirm-title" className="text-lg font-bold text-primary">
            {title}
          </h3>
          <p className="py-4 text-sm">{description}</p>
          {message && (
            <div role="alert" className={`alert mb-4 text-sm ${message.ok ? "" : "alert-error"}`}>
              {message.text}
            </div>
          )}
          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-ghost" disabled={pending}>
                Cancelar
              </button>
            </form>
            <button type="button" className="btn btn-accent font-bold" onClick={confirm} disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button aria-label="Cerrar">Cerrar</button>
        </form>
      </dialog>
    </>
  );
}
