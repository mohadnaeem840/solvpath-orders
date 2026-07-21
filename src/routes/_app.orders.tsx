import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";

import { ordersInfiniteQuery } from "@/lib/api/queries";
import type { OrderStatus } from "@/lib/mockApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Money } from "@/components/app/Money";
import { EmptyState } from "@/components/app/EmptyState";
import { ErrorState } from "@/components/app/ErrorState";
import { orderSubtotalCents } from "@/lib/money";
import { cn } from "@/lib/utils";

const STATUSES: Array<OrderStatus | "all"> = [
  "all",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const STATUS_LABEL: Record<(typeof STATUSES)[number], string> = {
  all: "All",
  processing: "Processing",
  shipped: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAGE_SIZE = 4;

const searchSchema = z.object({
  status: fallback(z.string(), "all").default("all"),
  q: fallback(z.string(), "").default(""),
});

type OrdersSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_app/orders")({
  head: () => ({
    meta: [
      { title: "Your orders — Solvpath" },
      {
        name: "description",
        content: "Browse your Solvpath orders, filter by status, and start a return.",
      },
      { property: "og:title", content: "Your orders — Solvpath" },
      {
        property: "og:description",
        content: "Browse your Solvpath orders, filter by status, and start a return.",
      },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ status: search.status, q: search.q }),
  loader: ({ context, deps }) => {
    context.queryClient.ensureInfiniteQueryData(
      ordersInfiniteQuery({
        pageSize: PAGE_SIZE,
        status: normalizeStatus(deps.status),
        query: deps.q,
      }),
    );
  },
  errorComponent: ({ reset }) => (
    <ErrorState
      message="We couldn't load your orders. This is usually temporary."
      onRetry={reset}
    />
  ),
  notFoundComponent: () => <EmptyState title="No orders found" />,
  component: OrdersPage,
});

function normalizeStatus(v: string): OrderStatus | "all" {
  return (["all", "processing", "shipped", "delivered", "cancelled"] as const).includes(v as never)
    ? (v as OrderStatus | "all")
    : "all";
}

function OrdersPage() {
  const { status, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const safeStatus = normalizeStatus(status);

  const [localQ, setLocalQ] = useState(q);
  useEffect(() => setLocalQ(q), [q]);
  useEffect(() => {
    if (localQ === q) return;
    const t = setTimeout(() => {
      navigate({ search: (prev: OrdersSearch) => ({ ...prev, q: localQ }) });
    }, 300);
    return () => clearTimeout(t);
  }, [localQ, q, navigate]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your orders</h1>
        <p className="text-sm text-muted-foreground">
          Track deliveries and start a return or exchange when you need to.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search orders"
            placeholder="Search by order # or product"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div
          role="tablist"
          aria-label="Filter by status"
          className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1"
        >
          {STATUSES.map((s) => {
            const active = safeStatus === s;
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                onClick={() =>
                  navigate({ search: (prev: OrdersSearch) => ({ ...prev, status: s }) })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </div>

      <Suspense fallback={<OrdersSkeleton />}>
        <OrdersList status={safeStatus} query={q} />
      </Suspense>
    </div>
  );
}

function OrdersList({
  status,
  query,
}: {
  status: OrderStatus | "all";
  query: string;
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSuspenseInfiniteQuery(
    ordersInfiniteQuery({ pageSize: PAGE_SIZE, status, query }),
  );
  const navigate = Route.useNavigate();

  const orders = useMemo(() => data.pages.flatMap((p) => p.data), [data.pages]);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (orders.length === 0) {
    return (
      <EmptyState
        title={query || status !== "all" ? "No matching orders" : "You have no orders yet"}
        message={
          query || status !== "all"
            ? "Try clearing filters or searching for a different term."
            : "Once you place an order, it'll show up here."
        }
        action={
          query || status !== "all" ? (
            <Button
              variant="outline"
              onClick={() => navigate({ search: () => ({ status: "all", q: "" }) })}
            >
              Clear filters
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {orders.map((order) => {
          const subtotal = orderSubtotalCents(order.items);
          const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
          return (
            <Link
              key={order.id}
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              className="group focus:outline-none"
            >
              <Card className="h-full transition-shadow hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Order
                      </p>
                      <p className="text-base font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Placed{" "}
                        {new Date(order.placedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 4).map((it) => (
                        <div
                          key={it.id}
                          className="h-9 w-9 rounded-lg border border-border"
                          style={{ backgroundColor: it.thumbColor ?? "var(--primary-soft)" }}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {order.items[0].name}
                      {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                    </p>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                    <p className="text-xs text-muted-foreground">
                      {itemCount} item{itemCount === 1 ? "" : "s"}
                    </p>
                    <Money cents={subtotal} className="text-base font-semibold text-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div
        ref={sentinelRef}
        aria-hidden
        className="flex items-center justify-center py-6"
      >
        {isFetchingNextPage ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading more orders…
          </span>
        ) : hasNextPage ? (
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
            Load more
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            You've reached the end.
          </p>
        )}
      </div>
    </div>
  );
}

function OrdersSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="mt-6 h-9 w-full" />
            <Skeleton className="mt-4 h-5 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
