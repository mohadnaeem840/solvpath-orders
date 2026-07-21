import type { OrderStatus } from "@/lib/mockApi";
import { cn } from "@/lib/utils";

const LABELS: Record<OrderStatus, string> = {
  processing: "Processing",
  shipped: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STYLES: Record<OrderStatus, string> = {
  delivered: "bg-success-soft text-success",
  shipped: "bg-info-soft text-info",
  processing: "bg-warning-soft text-warning",
  cancelled: "bg-danger-soft text-danger",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}

export const statusLabel = (s: OrderStatus) => LABELS[s];
