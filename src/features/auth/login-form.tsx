"use client";

import { useActionState } from "react";
import { LogIn, LoaderCircle } from "lucide-react";
import { PasswordInput } from "@/components/forms/password-input";
import { signInAction, type AuthFormState } from "./actions";

const initial: AuthFormState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="form-control w-full">
        <span className="label-text mb-1 font-medium">Correo electrónico</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input w-full"
          placeholder="nombre@institucion.gob"
        />
      </label>
      <PasswordInput label="Contraseña" name="password" id="password" required />

      {state.error && (
        <div role="alert" className="alert alert-error text-sm font-medium">
          {state.error}
        </div>
      )}

      <button type="submit" className="btn btn-accent w-full font-bold" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" aria-hidden /> Verificando…
          </>
        ) : (
          <>
            <LogIn className="size-4" aria-hidden /> Ingresar
          </>
        )}
      </button>
    </form>
  );
}
