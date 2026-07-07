# ATS Facility Portal

Self-service scheduling portal for **NEMT payer / facility users** (e.g. a dialysis
center booking patient trips). Payer users sign in, book patient trips priced by the
payer's rate schedule, review booking history, edit/cancel trips, add extra legs to a
booking, and view invoices.

This is the **frontend only**. It talks to the ATS payer-portal API described in
`ATS_Booking_api/doc/payer-portal-flow.md` (base URL configured via `VITE_API_BASE`).

## Stack

- **React 18 + TypeScript + Vite**
- **MUI v9** (`@mui/material`, `@mui/icons-material`) + **MUI X v9** DataGrid & Date Pickers (community/MIT)
- **React Router v6** data router
- **TanStack Query v5** for all server state
- **axios** single instance with a JWT refresh-retry interceptor
- **React Hook Form + Zod** (`zodResolver`) for every form
- **dayjs** (`AdapterDayjs`) for dates
- Self-hosted **Inter** + **IBM Plex Mono** via `@fontsource`

## Getting started

```bash
npm install
cp .env.example .env      # then set VITE_API_BASE to your API server root
npm run dev               # http://localhost:5173
```

`.env`:

```
VITE_API_BASE=http://localhost:8000
```

> `VITE_API_BASE` is the **server root** — no path. Auth lives under `/user/…`, the
> portal under `/api/payer/…`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check (`tsc -b`) + production build |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |

## Auth

- Login (`POST /user/auth/login/`) stores `{access, refresh, user}` in memory (React
  context) and mirrors them to a `ats.portal.tokens` cookie so a reload stays signed
  in. The app is gated on `user.user_type === "payer"`.
- The axios instance attaches `Authorization: Bearer <access>` to every call and, on a
  `401`, refreshes **once** (single-flight — concurrent 401s queue behind one refresh),
  saves the rotated `{access, refresh}`, and retries the original request. If refresh
  fails, the session is cleared and the guard redirects to `/login`.
- Logout posts the refresh token, then clears local storage.

## Routes

```
/login                 public
/                      → /bookings
/book                  booking wizard (quote → confirm, multi-leg)
/bookings              booking history (DataGrid)
/bookings/:ref         booking detail (edit / cancel / add trip)
/trips                 all trips (DataGrid, date filters)
/invoices              invoice list
/invoices/:uuid        invoice detail (+ lines)
/settings              change password
```

The drawer + header (`AppShell`) is a single shared parent layout for every protected
route; `RequirePayer` guards the whole subtree.

## Project layout

```
src/
  api/          axios client (JWT refresh-retry) + typed endpoint fns + types
  auth/         token store (memory + cookie), AuthContext, route guard
  query/        TanStack Query keys + hooks (queries + optimistic mutations)
  theme/        light/dark theme factory + ColorMode context
  components/   AppShell, DataTable, StatusChip, Money, Ref, dialogs, form fields, toasts
  pages/        one folder per feature (login, book, bookings, trips, invoices, settings)
  utils/        formatting, error parsing, form + validation helpers
```

## Notes / known constraints

- **Pricing is always server-sourced and read-only.** Quotes and bookings are priced
  from the payer's rate schedule; the client never sets a price.
- **Multi-payer switcher:** the API has no endpoint to *enumerate* a user's payers
  with their UUIDs (`resolve_portal_payer` only errors "specify which"), so the UI
  ships the single-payer path — which covers a facility user — and plumbs `payer_uuid`
  through the API layer for when an enumeration endpoint exists. A multi-payer account
  surfaces an honest message rather than a switcher it can't populate.
- Cookies mirror tokens as JS-readable (the backend returns tokens in the body); the
  `Secure` flag is set only over HTTPS so dev over `http://localhost` still persists.
```
