import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card border border-dashed border-primary/40 bg-base-100">
      <div className="card-body items-center gap-2 py-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-base-200 text-primary">
          <Inbox className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-bold text-primary">{title}</h2>
        {children && <div className="max-w-md text-sm text-primary/80">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
