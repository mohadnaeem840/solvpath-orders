/**
 * Money helpers. All prices are integer cents — arithmetic stays in cents,
 * rounding happens only at the end.
 */
import type { OrderItem, ReturnResolution } from "./mockApi";

export function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function orderSubtotalCents(items: OrderItem[]): number {
  return items.reduce((sum, it) => sum + it.unitPriceCents * it.quantity, 0);
}

export interface ReturnLine {
  item: OrderItem;
  quantity: number;
}

export function returnBaseCents(lines: ReturnLine[]): number {
  return lines.reduce((sum, { item, quantity }) => sum + item.unitPriceCents * quantity, 0);
}

/**
 * Compute the total the customer receives. Store credit adds a +10% bonus.
 * Refund / exchange return the base amount.
 */
export function computeResolutionAmount(
  lines: ReturnLine[],
  resolution: ReturnResolution,
): { baseCents: number; bonusCents: number; totalCents: number } {
  const baseCents = returnBaseCents(lines);
  const bonusCents = resolution === "store_credit" ? Math.round(baseCents * 0.1) : 0;
  return { baseCents, bonusCents, totalCents: baseCents + bonusCents };
}
