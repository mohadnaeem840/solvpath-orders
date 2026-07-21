import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-deep">
        {icon ?? <PackageOpen className="h-6 w-6" />}
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {message ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
