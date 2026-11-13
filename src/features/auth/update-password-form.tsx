"use client";

import { useActionState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { PasswordInput } from "@/components/forms/password-input";
import { updatePasswordAction, type AuthFormState } from "./actions";

const initial: AuthFormState = {};

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <PasswordInput label="Nueva contraseña" name="password" id="password" autoComplete="new-password" required />
      <PasswordInput label="Confirmar contraseña" name="confirm" id="confirm" autoComplete="new-password" required />
      {state.error && (
        <div role="alert" className="alert alert-error text-sm">
          {state.error}
        </div>
      )}
      <button type="submit" className="btn btn-accent w-full font-bold" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
        Guardar contraseña
      </button>
    </form>
  );
}
