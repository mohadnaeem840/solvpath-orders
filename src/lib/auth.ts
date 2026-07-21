import { useSyncExternalStore } from "react";

const STORAGE_KEY = "solvpath.session";

export type Session = { email: string; name: string } | null;

const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSession: Session = null;

// useSyncExternalStore compares snapshots by reference, so read() must return
// the same object when the underlying storage hasn't changed — otherwise every
// render looks like a store update and React loops forever re-rendering.
function read(): Session {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    cachedSession = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function emit() {
  listeners.forEach((l) => l());
}

export function getSession(): Session {
  return read();
}

export function isAuthenticated(): boolean {
  return read() !== null;
}

export function signIn(email: string): Session {
  const session: Session = {
    email,
    name: email.split("@")[0] || "Customer",
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  emit();
  return session;
}

export function signOut(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useSession(): Session {
  return useSyncExternalStore(
    subscribe,
    () => read(),
    () => null,
  );
}

// Demo credentials shown on the login screen.
export const DEMO_CREDENTIALS = {
  email: "demo@solvpath.com",
  password: "solvpath",
};
