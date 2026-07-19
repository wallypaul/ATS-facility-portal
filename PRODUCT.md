# PRODUCT.md — ATS Facility Portal

**Register:** product (a tool, not a showcase). The UI serves the task: speed,
density, and zero ambiguity on dates, times, and money. Familiarity is a
feature — it should feel like Stripe/Linear-grade internal tooling and
disappear into the work.

## What it is

Frontend-only React app: the **payer/facility self-service portal** for ATS
NEMT (non-emergency medical transport). A scheduling coordinator at a facility
(e.g. a dialysis center) signs in and books recurring patient trips, reviews
history, edits/cancels planned trips, adds legs to a booking, and **views &
pays the invoices billed to their facility**. Auth is JWT (portal login);
`user_type` must be `payer`. The Django backend is a separate repo.

## Users

- **Payer/facility contact** — the only user type. Task-focused, returns often,
  cares about "what do I owe, what's scheduled, what happened." Not a designer,
  not a power admin; wants correctness and no surprises around money.

## Surfaces

Book · Bookings (list + detail) · Trips · **Invoices (list + detail + online
pay)** · Settings. `AppShell` (drawer + header) wraps every protected route;
`RequirePayer` guards the subtree.

## Design principles

- **Money and dates are sacred.** Money renders in IBM Plex Mono, tabular
  figures, `$` currency-formatted, never as prose. Dates are **MM/DD/YYYY** via
  the single shared `formatDate`. `null` due dates read "on receipt", never a
  blank cell.
- **Pricing is server-sourced and read-only.** The client never sets or
  overrides an amount; the pay flow settles the server-computed outstanding
  balance.
- **Never leak existence.** Another payer's / draft / missing record is a
  single generic "not found" (404), not a distinct message.
- **State coverage is the job.** Every list and detail ships loading (skeleton),
  empty (teaching), error (retry), and success states — not just the happy path.

## Visual system (do not "fix" in an audit — all intended)

- **Brand:** deep pine-teal (`#0E6E62` light / `#4FB3A4` dark), medical-
  trustworthy, deliberately not SaaS-indigo. **Amber** (`#C77700`) is the single
  attention accent (pending / money-owed only). Light + dark, both AA.
- **Apple-style frosted glass** (user explicitly requested, overriding the
  original no-glassmorphism brief): surfaces use `glassSx()` in `theme.ts` —
  translucent tint + `backdrop-filter` blur/saturate, hairline borders, soft
  neumorphic shadows, an ambient brand-tinted `body` backdrop, and a
  `prefers-reduced-transparency` → solid fallback. Inputs and filled toasts stay
  solid for legibility. Radius 12 / 16 / 20.
- **Type:** Inter for UI, IBM Plex Mono for money / refs / IDs. Fixed rem scale.

## Stack

React 18.3 + TS 5 + Vite · MUI v9.2 + MUI X v9.8 (DataGrid/Pickers) · Emotion ·
TanStack Query v5 · axios (single-flight 401 refresh) · React Router v6 data
router · RHF v7 + zod · dayjs. Icons: `@mui/icons-material` (one set — don't mix).

## Constraints / not-yet

- No in-portal invoice PDF/Excel download (delivered as email attachment); don't
  build a dead download control.
- No invoice list filters/search — pagination only.
- No partial/custom-amount payment — pay always settles full outstanding.
- No multi-payer enumeration endpoint — single-payer path only.
