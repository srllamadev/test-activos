"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string };

export function PasswordInput({ label, id, name, ...props }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="form-control w-full">
      <span className="label-text mb-1 font-medium">{label}</span>
      <div className="join w-full">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          className="input join-item w-full"
          autoComplete={props.autoComplete ?? "current-password"}
          {...props}
        />
        <button
          type="button"
          className="btn join-item"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </label>
  );
}
