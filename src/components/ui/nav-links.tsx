"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavGroup } from "./nav";

export function NavLinks({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-primary-content/60">
            {group.title}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              if (!item.available) {
                return (
                  <li key={item.href}>
                    <span
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-primary-content/45"
                    >
                      <Icon className="size-4" aria-hidden />
                      <span className="flex-1">{item.label}</span>
                      <span className="badge badge-xs border-primary-content/30 bg-transparent text-primary-content/60">
                        Pronto
                      </span>
                    </span>
                  </li>
                );
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-accent ${
                      active
                        ? "bg-accent text-accent-content font-bold shadow-sm"
                        : "text-primary-content hover:bg-primary-content/10"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
