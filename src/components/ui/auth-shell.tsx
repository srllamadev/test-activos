import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

export function AuthShell({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-base-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Activos y Riesgos</p>
        </div>
        <div className="card bg-base-100 border border-primary/15 shadow-lg">
          <div className="card-body gap-5 p-6 sm:p-8">
            <header>
              <h1 className="text-2xl font-bold text-primary">{title}</h1>
              {description && <p className="mt-1 text-sm text-primary/80">{description}</p>}
            </header>
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
