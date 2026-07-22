# Solvpath — Orders & Returns

A customer-facing portal for viewing orders and starting returns/exchanges.

## Requirements

- [Bun](https://bun.sh) 1.x — install with `curl -fsSL https://bun.sh/install | bash`
- Node 20.19+ or 22.12+ (used by Vite under the hood; check with `node -v`)

## Setup

```bash
bun install
bun run dev
```

App runs at `http://localhost:3000` (or the next free port if 3000 is taken).

### Demo login

The backend is mocked — any non-empty email/password signs you in. The login screen is prefilled with `demo@solvpath.com`.

## Scripts

- `bun run dev` — start dev server
- `bun run build` — production build (outputs to `.output/`, targets Cloudflare Workers via Nitro)
- `bun run preview` — preview the production build locally
- `bun run lint` — lint with ESLint
- `bun run format` — format with Prettier

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19) + [TanStack Router](https://tanstack.com/router) for file-based routing and SSR
- [TanStack Query](https://tanstack.com/query) for data fetching/caching
- Tailwind CSS 4 + Radix UI primitives (shadcn/ui-style components)
- [Nitro](https://nitro.build) for the server build/deploy target

## Project structure

- `src/routes/` — file-based routes (`_app.*` are the authenticated layout + pages, `login`/`index` are public)
- `src/lib/mockApi.ts` — fixed mock "backend" contract (orders, returns) — treat as read-only
- `src/lib/auth.ts` — client-side (localStorage-based) session/auth state
- `src/components/ui/` — reused UI primitives (see Limitations)
- `src/components/app/` — app-specific components

## Limitations

- Due to time constraints, UI components were reused from an existing project rather than built from scratch.
- Auth is mocked via `localStorage`, not a real session/cookie — there's no server-verifiable login.

- ## Decisions & Tradeoffs

Some notes on choices made along the way, in case it's useful context:

- **Reused UI components** from an existing project instead of building from scratch. Time was tight, so the focus was on getting the orders/returns flow working end to end rather than polishing every component.
- **Mock backend (`src/lib/mockApi.ts`) treated as a fixed contract.** Didn't touch its behavior, just built the app against it like a real API.
- **Auth is mocked via `localStorage`**, not real sessions/cookies. Any non-empty email/password signs you in. Fine for a demo, but the server can never actually verify who's logged in. Worth flagging if this were headed to prod.
- **Root route (`/`) always redirects** to `/orders` or `/login` depending on auth state. It's not a real page, just a routing decision point.
- **Deploying to Vercel** via Nitro's `vercel` preset (Build Output API). Swapped from an earlier Cloudflare Workers target.
- Cleaned up leftover scaffolding (stray AI flavored comments, unused files) so the repo reads like a normal hand built project.

Given more time, next on the list would be real UI polish, proper auth/session handling, and test coverage.

