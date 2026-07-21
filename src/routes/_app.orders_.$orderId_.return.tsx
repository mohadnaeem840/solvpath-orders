import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Suspense, useMemo, useReducer, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { orderQuery } from "@/lib/api/queries";
import {
  ApiError,
  submitReturn,
  type Order,
  type OrderItem,
  type ReturnResolution,
} from "@/lib/mockApi";
import { computeResolutionAmount, formatMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/app/ErrorState";
import { EmptyState } from "@/components/app/EmptyState";
import { Money } from "@/components/app/Money";
import { cn } from "@/lib/utils";

type Step = "items" | "reason" | "review";
const STEPS: Step[] = ["items", "reason", "review"];
const STEP_LABEL: Record<Step, string> = {
  items: "Items",
  reason: "Reason",
  review: "Review",
};

const REASONS = [
  { value: "damaged", label: "Arrived damaged" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "doesnt_fit", label: "Doesn't fit" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
] as const;

const RESOLUTIONS: { value: ReturnResolution; title: string; desc: string }[] = [
  { value: "refund", title: "Refund", desc: "Back to your original payment method." },
  { value: "exchange", title: "Exchange", desc: "Swap for a different size or color." },
  { value: "store_credit", title: "Store credit", desc: "Get +10% extra to spend later." },
];

const searchSchema = z.object({
  step: fallback(z.string(), "items").default("items"),
});

export const Route = createFileRoute("/_app/orders_/$orderId_/return")({
  head: ({ params }) => ({
    meta: [
      { title: `Return order ${params.orderId} — Solvpath` },
      { name: "description", content: "Start a return or exchange for your order." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  loader: async ({ context, params }) => {
    try {
      await context.queryClient.ensureQueryData(orderQuery(params.orderId));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) throw notFound();
      throw e;
    }
  },
  errorComponent: ({ reset }) => (
    <ErrorState message="We couldn't start your return. Please try again." onRetry={reset} />
  ),
  notFoundComponent: () => (
    <EmptyState
      title="Order not found"
      action={
        <Button asChild>
          <Link to="/orders">Back to orders</Link>
        </Button>
      }
    />
  ),
  component: ReturnPage,
});

function ReturnPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
      <ReturnFlow />
    </Suspense>
  );
}

type FlowState = {
  quantities: Record<string, number>;
  reason: string;
  comment: string;
  resolution: ReturnResolution;
};

type Action =
  | { type: "setQty"; itemId: string; qty: number }
  | { type: "setReason"; reason: string }
  | { type: "setComment"; comment: string }
  | { type: "setResolution"; resolution: ReturnResolution };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "setQty":
      return { ...state, quantities: { ...state.quantities, [action.itemId]: action.qty } };
    case "setReason":
      return { ...state, reason: action.reason };
    case "setComment":
      return { ...state, comment: action.comment };
    case "setResolution":
      return { ...state, resolution: action.resolution };
  }
}

function ReturnFlow() {
  const { orderId } = Route.useParams();
  const { step: rawStep } = Route.useSearch();
  const navigate = useNavigate();
  const { data: order } = useSuspenseQuery(orderQuery(orderId));

  const step: Step = (STEPS as string[]).includes(rawStep) ? (rawStep as Step) : "items";

  const eligibleItems = useMemo(
    () => order.items.filter((i) => i.returnEligible),
    [order.items],
  );

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    quantities: Object.fromEntries(eligibleItems.map((i) => [i.id, 0])),
    reason: "",
    comment: "",
    resolution: "refund" as ReturnResolution,
  }));

  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const selectedLines = useMemo(
    () =>
      eligibleItems
        .map((item) => ({ item, quantity: state.quantities[item.id] ?? 0 }))
        .filter((l) => l.quantity > 0),
    [eligibleItems, state.quantities],
  );

  const amounts = computeResolutionAmount(selectedLines, state.resolution);

  const mutation = useMutation({
    mutationFn: submitReturn,
    onSuccess: (r) => {
      setSubmittedId(r.returnId);
      toast.success("Return request submitted");
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  if (order.status !== "delivered" || eligibleItems.length === 0) {
    return (
      <EmptyState
        title="This order isn't eligible for a return"
        message={
          order.status !== "delivered"
            ? "Returns become available once your order is delivered."
            : "None of the items on this order can be returned."
        }
        action={
          <Button asChild>
            <Link to="/orders/$orderId" params={{ orderId }}>
              Back to order
            </Link>
          </Button>
        }
      />
    );
  }

  if (submittedId) {
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-success">
          <Check className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Return submitted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your reference is{" "}
            <span className="font-mono font-medium text-foreground">{submittedId}</span>. We'll
            email you next steps within one business day.
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/orders/$orderId" params={{ orderId }}>
              View order
            </Link>
          </Button>
          <Button asChild>
            <Link to="/orders">Back to orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canAdvanceItems = selectedLines.length > 0;
  const canAdvanceReason = state.reason !== "";

  const goStep = (s: Step) =>
    navigate({
      to: "/orders/$orderId/return",
      params: { orderId },
      search: { step: s },
    });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/orders/$orderId"
        params={{ orderId }}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-deep hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Back to order
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Return or exchange
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Order {order.orderNumber}
        </p>
      </header>

      <StepIndicator current={step} />

      {step === "items" && (
        <ItemsStep
          items={eligibleItems}
          quantities={state.quantities}
          onChange={(itemId, qty) => dispatch({ type: "setQty", itemId, qty })}
        />
      )}

      {step === "reason" && (
        <ReasonStep
          reason={state.reason}
          comment={state.comment}
          resolution={state.resolution}
          amounts={amounts}
          onReason={(r) => dispatch({ type: "setReason", reason: r })}
          onComment={(c) => dispatch({ type: "setComment", comment: c })}
          onResolution={(r) => dispatch({ type: "setResolution", resolution: r })}
        />
      )}

      {step === "review" && (
        <ReviewStep order={order} lines={selectedLines} state={state} amounts={amounts} />
      )}

      <div className="sticky bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        {step !== "items" ? (
          <Button
            variant="outline"
            onClick={() => goStep(step === "review" ? "reason" : "items")}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span />
        )}
        {step !== "review" ? (
          <Button
            onClick={() => goStep(step === "items" ? "reason" : "review")}
            disabled={step === "items" ? !canAdvanceItems : !canAdvanceReason}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={() =>
              mutation.mutate({
                orderId: order.id,
                items: selectedLines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })),
                reason: state.reason,
                resolution: state.resolution,
                comment: state.comment || undefined,
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Submitting…" : "Submit return"}
          </Button>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.indexOf(current);
  return (
    <ol className="flex items-center gap-2 text-xs font-medium">
      {STEPS.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full border text-[11px]",
                done && "border-accent bg-accent text-accent-foreground",
                active && "border-primary bg-primary text-primary-foreground",
                !done && !active && "border-border bg-card text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                active ? "text-foreground" : "text-muted-foreground",
                "hidden sm:inline",
              )}
            >
              {STEP_LABEL[s]}
            </span>
            {i < STEPS.length - 1 && (
              <span className="h-px flex-1 bg-border" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ItemsStep({
  items,
  quantities,
  onChange,
}: {
  items: OrderItem[];
  quantities: Record<string, number>;
  onChange: (itemId: string, qty: number) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const qty = quantities[item.id] ?? 0;
            return (
              <li key={item.id} className="flex items-center gap-4 p-5">
                <div
                  className="h-12 w-12 flex-none rounded-lg border border-border"
                  style={{ backgroundColor: item.thumbColor ?? "var(--primary-soft)" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(item.unitPriceCents)} · Ordered {item.quantity}
                  </p>
                </div>
                <QtyStepper
                  value={qty}
                  min={0}
                  max={item.quantity}
                  onChange={(n) => onChange(item.id, n)}
                  label={`Return quantity for ${item.name}`}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function QtyStepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-border bg-card"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground disabled:opacity-40"
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground disabled:opacity-40"
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function ReasonStep({
  reason,
  comment,
  resolution,
  amounts,
  onReason,
  onComment,
  onResolution,
}: {
  reason: string;
  comment: string;
  resolution: ReturnResolution;
  amounts: { baseCents: number; bonusCents: number; totalCents: number };
  onReason: (r: string) => void;
  onComment: (c: string) => void;
  onResolution: (r: ReturnResolution) => void;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-base font-semibold">Why are you returning these items?</h2>
          <RadioGroup value={reason} onValueChange={onReason} className="gap-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                htmlFor={`reason-${r.value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                  reason === r.value && "border-accent bg-accent-soft",
                )}
              >
                <RadioGroupItem id={`reason-${r.value}`} value={r.value} />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </RadioGroup>
          <div className="space-y-2">
            <Label htmlFor="comment" className="text-sm">
              Additional details (optional)
            </Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => onComment(e.target.value)}
              placeholder="Anything we should know?"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-base font-semibold">How would you like to resolve it?</h2>
          <RadioGroup
            value={resolution}
            onValueChange={(v) => onResolution(v as ReturnResolution)}
            className="grid gap-2 sm:grid-cols-3"
          >
            {RESOLUTIONS.map((r) => (
              <label
                key={r.value}
                htmlFor={`res-${r.value}`}
                className={cn(
                  "flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-4 transition-colors",
                  resolution === r.value && "border-accent bg-accent-soft",
                )}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`res-${r.value}`} value={r.value} />
                  <span className="text-sm font-semibold">{r.title}</span>
                </div>
                <span className="pl-6 text-xs text-muted-foreground">{r.desc}</span>
              </label>
            ))}
          </RadioGroup>

          <div className="rounded-xl border border-border bg-primary-soft/40 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Return value</span>
              <Money cents={amounts.baseCents} className="font-medium" />
            </div>
            {amounts.bonusCents > 0 && (
              <div className="mt-1 flex justify-between text-accent-deep">
                <span>Store credit bonus (+10%)</span>
                <Money cents={amounts.bonusCents} className="font-medium" />
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
              <span>You receive</span>
              <Money cents={amounts.totalCents} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReviewStep({
  order,
  lines,
  state,
  amounts,
}: {
  order: Order;
  lines: { item: OrderItem; quantity: number }[];
  state: FlowState;
  amounts: { baseCents: number; bonusCents: number; totalCents: number };
}) {
  const reasonLabel =
    REASONS.find((r) => r.value === state.reason)?.label ?? state.reason;
  const resolutionLabel =
    RESOLUTIONS.find((r) => r.value === state.resolution)?.title ?? state.resolution;

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-base font-semibold">Review your request</h2>
          <p className="text-xs text-muted-foreground">Order {order.orderNumber}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Items
          </p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {lines.map(({ item, quantity }) => (
              <li key={item.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">Qty {quantity}</p>
                </div>
                <Money cents={item.unitPriceCents * quantity} className="text-sm font-medium" />
              </li>
            ))}
          </ul>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Reason
            </dt>
            <dd className="mt-1">{reasonLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Resolution
            </dt>
            <dd className="mt-1">{resolutionLabel}</dd>
          </div>
          {state.comment && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </dt>
              <dd className="mt-1 whitespace-pre-line">{state.comment}</dd>
            </div>
          )}
        </dl>

        <div className="rounded-xl border border-border bg-primary-soft/40 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Return value</span>
            <Money cents={amounts.baseCents} className="font-medium" />
          </div>
          {amounts.bonusCents > 0 && (
            <div className="mt-1 flex justify-between text-accent-deep">
              <span>Store credit bonus</span>
              <Money cents={amounts.bonusCents} className="font-medium" />
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>You'll receive</span>
            <Money cents={amounts.totalCents} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
