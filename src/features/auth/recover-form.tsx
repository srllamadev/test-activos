"use client";

import { useActionState } from "react";
import { Mail, LoaderCircle } from "lucide-react";
import { requestPasswordResetAction, type AuthFormState } from "./actions";

const initial: AuthFormState = {};

export function RecoverForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Correo electrónico</span>
        <input name="email" type="email" required autoComplete="email" className="input w-full" />
      </label>
      {state.error && <div role="alert" className="alert alert-error text-sm">{state.error}</div>}
      {state.success && <div role="status" className="alert text-sm">{state.success}</div>}
      <button type="submit" className="btn btn-accent w-full font-bold" disabled={pending}>
        {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Mail className="size-4" aria-hidden />}
        Enviar enlace
      </button>
    </form>
  );
}
