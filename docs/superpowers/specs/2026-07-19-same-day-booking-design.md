# Same-day trips per booking

## Problem

A booking can have multiple legs (e.g. an outbound trip and a return). Today each leg has
its own independent date picker, so a payer can accidentally create a booking whose legs
land on different calendar days. Pickup/drop-off location and time should stay independent
per leg, but the date must be the same across every trip in a booking, both at creation and
afterward.

## Scope

Applies to:
- **Creating a booking** (`src/pages/book/BookPage.tsx`) — the multi-leg form.
- **Adding a trip to an existing booking** (`src/components/TripDialog.tsx`, `mode="add"`).
- **Editing an existing trip** (`src/components/TripDialog.tsx`, `mode="edit"`).

Not in scope: server-side enforcement. This repo is frontend-only (backend lives in
`ATS_Booking_api`, not in this repo); the invariant is enforced client-side only.

## Design

### Book page — one date field, not one per leg

`date` moves out of the per-leg `legSchema` and onto the top-level form schema as a single
required field (`tripDateSchema`: today-or-later, same validation as today).

- **Leg 1** (field-array index `0`) renders the actual `FormDatePicker` for this field, in
  the same spot the picker occupies today.
- **Leg 2+** (index `> 0`) render the field's current value as read-only text (formatted
  MM/DD/YYYY per the app's date convention) with a small caption, e.g. "Same day as Leg 1."
  If no date has been picked yet, show a placeholder: "Select a date on Leg 1 first."

Because there is exactly one `date` value in form state, there is nothing to keep in sync —
adding, removing, or reordering legs can't desync anything. On submit, every entry in
`tripsData` is stamped with that single date.

### Trip dialog — date becomes read-only, not a form field

`date` is removed from `TripDialog`'s zod schema and form entirely; it stops being an
editable field in both modes.

- **Edit mode:** display `trip.date` as read-only text, reusing the app's existing
  read-only-field box style (the one already used for price/distance in this dialog).
  Submitted payload's date is `trip.date`, unchanged from before.
- **Add mode:** needs the booking's already-established date. `BookingDetailPage` passes a
  new `bookingDate` prop to `<TripDialog>`, derived from any existing trip on the booking
  (`data.trips[0]?.date ?? null`). When present, displayed read-only the same way as edit
  mode, and the submitted payload's date is `bookingDate`.

  **Edge case:** a booking can have zero active trips (all cancelled — `BookingDetailPage`
  already renders an empty state with its own "Add trip" affordance for this). There's no
  established date to lock to, so when `bookingDate` is absent, Add mode falls back to an
  editable date picker (`tripDateSchema`: today-or-later), exactly like today's behavior.
  The lock only applies once the booking has at least one trip to anchor to.

### Error handling

No new failure modes. With a single source of truth for date, there is no "dates disagree"
state to validate against or report errors for. The existing `tripDateSchema` (today-or-
later) still gates the one date field on the Book page.

## Testing

Manual verification (no backend in this repo to integration-test against):
1. Book page: add a second leg, confirm it shows read-only text (not a picker) mirroring
   Leg 1's date, and updates live when Leg 1's date changes.
2. Book page: remove Leg 1 while a Leg 2+ exists, confirm the new first leg gets the picker
   and keeps the previously-chosen date (not blank).
3. Existing booking (≥1 trip): open "Add trip," confirm the date shown is read-only and
   matches the booking's existing trips.
4. Existing booking: open "Edit trip," confirm the date is read-only and unchanged after
   saving other fields.
5. Booking with zero active trips (all cancelled): open "Add trip," confirm the date is an
   editable picker (today-or-later), same as today's behavior.
