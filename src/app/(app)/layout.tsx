import Link from "next/link";
import type { ReactNode } from "react";
import { Menu, LogOut, UserRound, ShieldCheck } from "lucide-react";
import { getAuthContext, ROLE_LABEL } from "@/lib/auth/context";
import { signOutAction } from "@/features/auth/actions";
import { NAV_GROUPS } from "@/components/ui/nav";
import { NavLinks } from "@/components/ui/nav-links";

// Contenido privado por usuario: se renderiza en el servidor en cada petición.
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  const ctx = await getAuthContext();

  return (
    <div className="drawer lg:drawer-open min-h-dvh bg-base-100">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex min-w-0 flex-col">
        <header className="navbar sticky top-0 z-20 gap-2 border-b border-primary/15 bg-base-100/95 px-4 backdrop-blur">
          <div className="flex-none lg:hidden">
            <label htmlFor="app-drawer" className="btn btn-ghost btn-square" aria-label="Abrir menú de navegación">
              <Menu className="size-5" aria-hidden />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary" title={ctx.organizationName}>
              {ctx.organizationName}
            </p>
            <p className="hidden text-xs text-primary/70 sm:block">Gestión de activos de información y riesgos</p>
          </div>
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost gap-2 px-2" aria-label="Menú de usuario">
              <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-content">
                <UserRound className="size-4" aria-hidden />
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-48 truncate text-sm font-medium text-primary">{ctx.email}</span>
                <span className="badge badge-sm badge-secondary mt-0.5">{ROLE_LABEL[ctx.role]}</span>
              </span>
            </div>
            <ul tabIndex={-1} className="dropdown-content menu z-30 mt-2 w-60 rounded-box bg-base-100 p-2 shadow-lg ring-1 ring-primary/15">
              <li className="menu-title text-xs">{ctx.email}</li>
              <li>
                <span className="pointer-events-none flex items-center gap-2 text-sm">
                  <ShieldCheck className="size-4" aria-hidden /> Rol: {ROLE_LABEL[ctx.role]}
                </span>
              </li>
              <li>
                <form action={signOutAction}>
                  <button type="submit" className="w-full justify-start">
                    <LogOut className="size-4" aria-hidden /> Cerrar sesión
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </header>

        <main id="contenido" className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      <div className="drawer-side z-40">
        <label htmlFor="app-drawer" aria-label="Cerrar menú" className="drawer-overlay" />
        <aside className="flex min-h-full w-72 flex-col bg-primary text-primary-content">
          <Link href="/" className="flex items-center gap-3 px-5 py-5">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-content">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-base font-bold leading-tight">Activos y Riesgos</span>
              <span className="block text-xs text-primary-content/75">Gestión institucional</span>
            </span>
          </Link>
          <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-6">
            <NavLinks groups={NAV_GROUPS} />
          </nav>
          <p className="px-5 pb-4 text-xs text-primary-content/60">
            Datos reales de la organización. Los cálculos siguen los criterios aprobados.
          </p>
        </aside>
      </div>
    </div>
  );
}
