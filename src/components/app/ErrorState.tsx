import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  action,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
      {message ? (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      ) : null}
      <div className="mt-6 flex gap-2">
        {onRetry ? <Button onClick={onRetry}>Try again</Button> : null}
        {action}
      </div>
    </div>
  );
}
