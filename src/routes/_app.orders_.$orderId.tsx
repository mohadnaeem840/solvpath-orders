import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import { orderQuery } from "@/lib/api/queries";
import { ApiError } from "@/lib/mockApi";
import { orderSubtotalCents } from "@/lib/money";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Money } from "@/components/app/Money";
import { ErrorState } from "@/components/app/ErrorState";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/orders_/$orderId")({
  head: ({ params }) => ({
    meta: [
      { title: `Order ${params.orderId} — Solvpath` },
      { name: "description", content: "Order details and return options." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(orderQuery(params.orderId));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) throw notFound();
      throw e;
    }
  },
  errorComponent: ({ reset }) => (
    <ErrorState message="We couldn't load this order. Please try again." onRetry={reset} />
  ),
  notFoundComponent: () => (
    <EmptyState
      title="Order not found"
      message="We couldn't find that order. It may have been removed."
      action={
        <Button asChild>
          <Link to="/orders">Back to orders</Link>
        </Button>
      }
    />
  ),
  component: OrderPage,
});

function OrderPage() {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderDetail />
    </Suspense>
  );
}

function OrderDetail() {
  const { orderId } = Route.useParams();
  const { data: order } = useSuspenseQuery(orderQuery(orderId));
  const subtotal = orderSubtotalCents(order.items);
  const canReturn =
    order.status === "delivered" && order.items.some((i) => i.returnEligible);

  return (
    <div className="space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Order {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Placed on{" "}
            {new Date(order.placedAt).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 p-5">
                <div
                  className="h-14 w-14 flex-none rounded-xl border border-border"
                  style={{ backgroundColor: it.thumbColor ?? "var(--primary-soft)" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Qty {it.quantity}
                    {!it.returnEligible ? " · Not eligible for return" : ""}
                  </p>
                </div>
                <Money
                  cents={it.unitPriceCents * it.quantity}
                  className="font-medium text-foreground"
                />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-border bg-primary-soft/40 p-5">
            <span className="text-sm font-medium text-foreground">Order total</span>
            <Money cents={subtotal} className="text-lg font-semibold text-foreground" />
          </div>
        </CardContent>
      </Card>

      {canReturn ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Need to return or exchange something?
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We'll guide you through it in three quick steps.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/orders/$orderId/return" params={{ orderId: order.id }}>
              Start a return
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {order.status === "delivered"
            ? "No items on this order are eligible for return."
            : "Returns become available once your order is delivered."}
        </p>
      )}
    </div>
  );
}

function OrderSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-64" />
      <Card>
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
