/**
 * solvpath take-home — mock backend.
 *
 * This is the only "server" you get. Import these functions and types into your
 * app and build against them exactly as you would a real HTTP API. You may read
 * this file, but please don't change its behavior — treat it as a fixed contract.
 * (You can, of course, wrap it in your own data-fetching layer.)
 */

export type OrderStatus = "processing" | "shipped" | "delivered" | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  unitPriceCents: number; // prices are integers, in cents
  quantity: number;
  thumbColor?: string;
  returnEligible: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  placedAt: string; // ISO date (YYYY-MM-DD)
  status: OrderStatus;
  items: OrderItem[];
}

export interface Page<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type ReturnResolution = "refund" | "exchange" | "store_credit";

export interface ReturnRequest {
  orderId: string;
  items: { itemId: string; quantity: number }[];
  reason: string;
  resolution: ReturnResolution;
  comment?: string;
}

export interface ReturnReceipt {
  returnId: string;
  createdAt: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

// Adjust while developing if you want deterministic behavior for a while.
export const apiConfig = {
  minLatencyMs: 350,
  maxLatencyMs: 900,
  listFailureRate: 0.12,
  submitFailureRate: 0.25,
};

const c = (n: number) => Math.round(n * 100);

const ORDERS: Order[] = [
  { id: "o_10432", orderNumber: "SP-10432", placedAt: "2026-06-03", status: "delivered", items: [
    { id: "i_1", name: "Aurora Wireless Headphones", unitPriceCents: c(142), quantity: 1, thumbColor: "#EDE9FF", returnEligible: true },
    { id: "i_2", name: "Aurora Travel Carry Case", unitPriceCents: c(42), quantity: 1, thumbColor: "#E6F7F4", returnEligible: true } ] },
  { id: "o_10419", orderNumber: "SP-10419", placedAt: "2026-06-09", status: "shipped", items: [
    { id: "i_3", name: "Cloud Foam Running Insoles", unitPriceCents: c(42), quantity: 1, returnEligible: true } ] },
  { id: "o_10401", orderNumber: "SP-10401", placedAt: "2026-06-12", status: "processing", items: [
    { id: "i_4", name: "Meridian Cold Brew Maker", unitPriceCents: c(79), quantity: 1, thumbColor: "#FDECEC", returnEligible: true } ] },
  { id: "o_10388", orderNumber: "SP-10388", placedAt: "2026-05-28", status: "delivered", items: [
    { id: "i_5", name: "Terra Ceramic Planter Set", unitPriceCents: c(64), quantity: 2, thumbColor: "#EFEAE2", returnEligible: true },
    { id: "i_6", name: "Organic Potting Mix (5L)", unitPriceCents: c(18), quantity: 1, returnEligible: false } ] },
  { id: "o_10377", orderNumber: "SP-10377", placedAt: "2026-05-19", status: "delivered", items: [
    { id: "i_7", name: "Lumen Desk Lamp", unitPriceCents: c(58), quantity: 1, thumbColor: "#E7EEFF", returnEligible: true } ] },
  { id: "o_10366", orderNumber: "SP-10366", placedAt: "2026-05-11", status: "cancelled", items: [
    { id: "i_8", name: "Nomad Weekender Duffel", unitPriceCents: c(120), quantity: 1, thumbColor: "#EDE9FF", returnEligible: false } ] },
  { id: "o_10352", orderNumber: "SP-10352", placedAt: "2026-05-02", status: "delivered", items: [
    { id: "i_9", name: "Ridge Merino Beanie", unitPriceCents: c(34), quantity: 3, returnEligible: true },
    { id: "i_10", name: "Ridge Wool Socks (2-pack)", unitPriceCents: c(22), quantity: 1, thumbColor: "#E6F7F4", returnEligible: true } ] },
  { id: "o_10341", orderNumber: "SP-10341", placedAt: "2026-04-24", status: "shipped", items: [
    { id: "i_11", name: "Harbor Rain Jacket", unitPriceCents: c(158), quantity: 1, thumbColor: "#E7EEFF", returnEligible: true } ] },
  { id: "o_10330", orderNumber: "SP-10330", placedAt: "2026-04-15", status: "delivered", items: [
    { id: "i_12", name: "Kettle & Stone Mug Set", unitPriceCents: c(46), quantity: 1, thumbColor: "#EFEAE2", returnEligible: true } ] },
  { id: "o_10318", orderNumber: "SP-10318", placedAt: "2026-04-06", status: "processing", items: [
    { id: "i_13", name: "Pulse Smart Scale", unitPriceCents: c(89), quantity: 1, returnEligible: true } ] },
  { id: "o_10307", orderNumber: "SP-10307", placedAt: "2026-03-29", status: "delivered", items: [
    { id: "i_14", name: "Verde Yoga Mat", unitPriceCents: c(68), quantity: 1, thumbColor: "#E6F7F4", returnEligible: true } ] },
  { id: "o_10295", orderNumber: "SP-10295", placedAt: "2026-03-20", status: "delivered", items: [
    { id: "i_15", name: "Atlas Water Bottle", unitPriceCents: c(29), quantity: 2, thumbColor: "#EDE9FF", returnEligible: true } ] },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const latency = () => apiConfig.minLatencyMs + Math.random() * (apiConfig.maxLatencyMs - apiConfig.minLatencyMs);
const throwIfAborted = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
};

export interface ListParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | "all";
  query?: string;
  signal?: AbortSignal;
}

/** GET /orders — paginated, filterable by status, searchable by order # or product name. */
export async function listOrders(params: ListParams = {}): Promise<Page<Order>> {
  const { page = 1, pageSize = 4, status = "all", query = "", signal } = params;
  await wait(latency());
  throwIfAborted(signal);
  if (Math.random() < apiConfig.listFailureRate) throw new ApiError(503, "The orders service is temporarily unavailable.");
  const q = query.trim().toLowerCase();
  const filtered = ORDERS.filter((o) => {
    if (status !== "all" && o.status !== status) return false;
    if (!q) return true;
    return o.orderNumber.toLowerCase().includes(q) || o.items.some((i) => i.name.toLowerCase().includes(q));
  });
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

/** GET /orders/:id */
export async function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  await wait(latency());
  throwIfAborted(signal);
  const order = ORDERS.find((o) => o.id === orderId);
  if (!order) throw new ApiError(404, "We couldn't find that order.");
  return order;
}

/** POST /returns */
export async function submitReturn(req: ReturnRequest): Promise<ReturnReceipt> {
  await wait(latency());
  if (Math.random() < apiConfig.submitFailureRate) throw new ApiError(500, "We couldn't submit your return. Please try again.");
  if (req.items.length === 0) throw new ApiError(422, "Select at least one item to return.");
  return { returnId: "rma_" + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString() };
}
