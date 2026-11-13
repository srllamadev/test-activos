import type { ReactNode } from "react";

export type BadgeTone = "primary" | "accent" | "neutral" | "outline";

const TONE: Record<BadgeTone, string> = {
  primary: "badge-primary",
  accent: "badge-accent font-bold",
  neutral: "badge-neutral",
  outline: "badge-outline",
};

/** Insignia con texto siempre visible: el estado nunca se comunica solo con color. */
export function Badge({
  tone = "neutral",
  size = "sm",
  children,
  className = "",
}: {
  tone?: BadgeTone;
  size?: "xs" | "sm" | "md";
  children: ReactNode;
  className?: string;
}) {
  return <span className={`badge badge-${size} ${TONE[tone]} ${className}`}>{children}</span>;
}
