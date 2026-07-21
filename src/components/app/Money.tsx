import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cn("tabular-nums", className)}>{formatMoney(cents)}</span>;
}
