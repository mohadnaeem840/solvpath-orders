import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { DEMO_CREDENTIALS, isAuthenticated, signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/solvpath-logo.png";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    if (typeof window !== "undefined" && isAuthenticated()) {
      throw redirect({ to: search.redirect ?? "/orders" });
    }
  },
  head: () => ({
    meta: [
      { title: "Sign in — Solvpath" },
      { name: "description", content: "Sign in to manage your Solvpath orders and returns." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Enter an email and password.");
      return;
    }
    setSubmitting(true);
    // Mock: any non-empty credentials succeed.
    signIn(email.trim());
    navigate({ to: redirectTo ?? "/orders" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src={logo} alt="Solvpath" className="h-8 w-auto" />
          <p className="text-sm text-muted-foreground">Sign in to view your orders</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" disabled={submitting} className="w-full">
              Sign in
            </Button>
          </div>
          <div className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-deep">
            <strong className="font-semibold">Demo:</strong> any email/password works.
            Prefilled with <code>{DEMO_CREDENTIALS.email}</code>.
          </div>
        </form>
      </div>
    </div>
  );
}
