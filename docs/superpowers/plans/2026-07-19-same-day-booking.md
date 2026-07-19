# Same-Day Trips Per Booking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every trip in a booking must share one calendar date; pickup/drop-off address and time stay independent per trip.

**Architecture:** Replace the Book page's per-leg `date` field with a single top-level form field, rendered as a picker on Leg 1 and read-only mirrored text on every other leg. Remove `date` as an editable field from the Edit/Add-trip dialog — Edit always shows the trip's existing date read-only; Add shows the booking's existing date read-only once the booking has a trip to anchor to, falling back to a picker only when the booking currently has zero trips.

**Tech Stack:** React 18 + TypeScript, react-hook-form v7 + zod v3 (`@hookform/resolvers`), dayjs, MUI v9 + MUI X date pickers. No changes to the backend (`ATS_Booking_api`, not in this repo).

## Global Constraints

- Client-side enforcement only — do not attempt to touch or coordinate with `ATS_Booking_api`; that's a separate repo and out of scope.
- Dates display as **MM/DD/YYYY** via the shared `formatDate` helper in `src/utils/format.ts` — never format a date ad hoc.
- **No test framework is configured in this repo** (`package.json` scripts are only `dev`, `build`, `preview`, `typecheck` — no vitest/jest/testing-library). Each task's verification step is therefore: (1) `npm run typecheck` must report zero errors, then (2) a manual browser walkthrough via `npm run dev` with the exact steps given in that task. This replaces the usual "write a failing test" step — there is no test runner to write one into.
- Follow existing code conventions exactly: RHF `Control<T>` + `useController`/`useWatch` for form fields, zod schemas per form, `applyServerFieldErrors` for server error mapping, MUI `Grid`/`Stack`/`Typography` for layout, em-dash-and-caption pattern for read-only fields (see the existing price/distance box in `TripDialog.tsx`).

---

### Task 1: Book page — one shared date field for all legs

**Files:**
- Modify: `src/pages/book/BookPage.tsx`

**Interfaces:**
- Consumes: `tripDateSchema`, `API_DATE`, `API_TIME` from `src/utils/validation.ts` (unchanged); `formatDate` from `src/utils/format.ts` (new import needed).
- Produces: `BookValues` (the form's inferred type) gains a top-level `date: Dayjs` field; `tripsData[i]` no longer has a `date` key. Nothing outside this file consumes `BookValues`, so no other file is affected.

This task moves `date` off of every leg and onto the form itself, so there is exactly one date value for the whole booking, displayed as a picker on Leg 1 and read-only text on every other leg.

- [ ] **Step 1: Update imports**

In `src/pages/book/BookPage.tsx`, change line 19 from:

```tsx
import { useForm, useFieldArray, type Control } from 'react-hook-form';
```

to:

```tsx
import { useForm, useFieldArray, useWatch, type Control } from 'react-hook-form';
```

Change line 22 from:

```tsx
import dayjs from 'dayjs';
```

to:

```tsx
import dayjs, { type Dayjs } from 'dayjs';
```

Change line 37 from:

```tsx
import { formatDistance } from '../../utils/format';
```

to:

```tsx
import { formatDate, formatDistance } from '../../utils/format';
```

- [ ] **Step 2: Move `date` out of `legSchema` and onto the top-level `schema`**

Change (around line 41-47):

```tsx
const legSchema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  date: tripDateSchema,
  time: timeSchema,
  service_level: z.string().min(1, 'Service level is required'),
});
```

to:

```tsx
const legSchema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  time: timeSchema,
  service_level: z.string().min(1, 'Service level is required'),
});
```

Change (around line 49-61):

```tsx
const schema = z.object({
  passenger: z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email'),
    phone_1: z.string().trim().min(1, 'Phone number is required'),
    dob: dobSchema,
  }),
  passengers: z.coerce.number().int().min(1, 'At least 1').max(20, 'Too many'),
  toll: z.boolean().default(false),
  weight: z.coerce.number().min(0).optional(),
  tripsData: z.array(legSchema).min(1, 'Add at least one leg'),
});
```

to:

```tsx
const schema = z.object({
  passenger: z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email'),
    phone_1: z.string().trim().min(1, 'Phone number is required'),
    dob: dobSchema,
  }),
  passengers: z.coerce.number().int().min(1, 'At least 1').max(20, 'Too many'),
  toll: z.boolean().default(false),
  weight: z.coerce.number().min(0).optional(),
  date: tripDateSchema,
  tripsData: z.array(legSchema).min(1, 'Add at least one leg'),
});
```

- [ ] **Step 3: Remove `date` from `emptyLeg` and add it to the form's `defaultValues`**

Change (around line 65-71):

```tsx
const emptyLeg = (serviceLevel: string) => ({
  pick_up_address: '',
  drop_off_address: '',
  date: null as never,
  time: null as never,
  service_level: serviceLevel,
});
```

to:

```tsx
const emptyLeg = (serviceLevel: string) => ({
  pick_up_address: '',
  drop_off_address: '',
  time: null as never,
  service_level: serviceLevel,
});
```

Change (around line 89-95, inside `useForm`'s `defaultValues`):

```tsx
    defaultValues: {
      passenger: { firstName: '', lastName: '', email: '', phone_1: '', dob: null as never },
      passengers: 1,
      toll: false,
      weight: undefined,
      tripsData: [emptyLeg('')],
    },
```

to:

```tsx
    defaultValues: {
      passenger: { firstName: '', lastName: '', email: '', phone_1: '', dob: null as never },
      passengers: 1,
      toll: false,
      weight: undefined,
      date: null as never,
      tripsData: [emptyLeg('')],
    },
```

- [ ] **Step 4: Use the single `date` value when building the submit payload**

Change (around line 149-156):

```tsx
      tripsData: values.tripsData.map((l) => ({
        pick_up_address: l.pick_up_address.trim(),
        drop_off_address: l.drop_off_address.trim(),
        date: dayjs(l.date).format(API_DATE),
        time: dayjs(l.time).format(API_TIME),
        service_level: l.service_level,
      })),
```

to:

```tsx
      tripsData: values.tripsData.map((l) => ({
        pick_up_address: l.pick_up_address.trim(),
        drop_off_address: l.drop_off_address.trim(),
        date: dayjs(values.date).format(API_DATE),
        time: dayjs(l.time).format(API_TIME),
        service_level: l.service_level,
      })),
```

- [ ] **Step 5: Update the server-error field allowlist**

Change (around line 163-177):

```tsx
      const valid = [
        'passenger.firstName',
        'passenger.lastName',
        'passenger.email',
        'passenger.phone_1',
        'passenger.dob',
        'passengers',
        ...values.tripsData.flatMap((_, i) => [
          `tripsData.${i}.pick_up_address`,
          `tripsData.${i}.drop_off_address`,
          `tripsData.${i}.date`,
          `tripsData.${i}.time`,
          `tripsData.${i}.service_level`,
        ]),
      ];
```

to:

```tsx
      const valid = [
        'passenger.firstName',
        'passenger.lastName',
        'passenger.email',
        'passenger.phone_1',
        'passenger.dob',
        'passengers',
        'date',
        ...values.tripsData.flatMap((_, i) => [
          `tripsData.${i}.pick_up_address`,
          `tripsData.${i}.drop_off_address`,
          `tripsData.${i}.time`,
          `tripsData.${i}.service_level`,
        ]),
      ];
```

- [ ] **Step 6: Render the picker on Leg 1 and read-only mirrored text on every other leg**

In the `LegCard` function (around line 343-359), add a `sharedDate` lookup right after the opening brace:

```tsx
function LegCard({
  control,
  index,
  services,
  quote,
  quoting,
  onQuote,
  onRemove,
}: {
  control: Control<BookValues>;
  index: number;
  services: ServiceLevel[];
  quote?: Quote;
  quoting: boolean;
  onQuote: () => void;
  onRemove?: () => void;
}) {
  const sharedDate = useWatch({ control, name: 'date' }) as Dayjs | null;
  return (
```

Then change the date `Grid` cell (around line 380-383) from:

```tsx
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormDatePicker control={control} name={`tripsData.${index}.date`} label="Date" disablePast />
        </Grid>
```

to:

```tsx
        <Grid size={{ xs: 12, sm: 4 }}>
          {index === 0 ? (
            <FormDatePicker control={control} name="date" label="Date" disablePast />
          ) : (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                Date
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                {sharedDate ? formatDate(sharedDate.format(API_DATE)) : '—'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {sharedDate ? 'Same day as Leg 1' : 'Select a date on Leg 1 first'}
              </Typography>
            </Box>
          )}
        </Grid>
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open the app, sign in, go to **Book a trip** (`/book`).

1. Fill in patient fields. On Leg 1, confirm there is a date picker (as before) and pick a date, e.g. today.
2. Click "Add another leg." Confirm Leg 2 shows **read-only text** with the same date you picked (not a picker), captioned "Same day as Leg 1."
3. Go back to Leg 1 and change its date. Confirm Leg 2's text updates immediately to match.
4. Click "Remove leg" on Leg 1 (the trash icon). Confirm the leg that is now first shows the **picker**, pre-filled with the date you'd already chosen (not blank).
5. Fill in the remaining required fields (addresses, time, service level for each leg) and submit. Confirm the booking is created successfully and, on the booking detail page, every trip shows the same date.

- [ ] **Step 9: Commit**

```bash
git add src/pages/book/BookPage.tsx
git commit -m "feat: enforce one shared date across all legs when booking a trip"
```

---

### Task 2: Trip dialog — date becomes read-only (with a picker fallback when the booking has no trips yet)

**Files:**
- Modify: `src/components/TripDialog.tsx`

**Interfaces:**
- Consumes: `optionalDate` from `src/utils/validation.ts` (already exported, not previously used here); `formatDate` from `src/utils/format.ts`.
- Produces: `TripDialogProps` gains an optional `bookingDate?: string | null` prop (add-mode only). `TripFormValues.date` becomes `Dayjs | null` (was `Dayjs`). Task 3 consumes the new `bookingDate` prop.

At the end of this task, **Edit mode always shows the trip's date read-only**. **Add mode** still shows an editable picker for now, because nothing passes `bookingDate` yet — that activation happens in Task 3. This keeps the task independently testable without depending on Task 3.

- [ ] **Step 1: Update imports**

Change (around line 23-24):

```tsx
import { API_DATE, API_TIME, timeSchema, tripDateSchema } from '../utils/validation';
import { formatDistance } from '../utils/format';
```

to:

```tsx
import { API_DATE, API_TIME, optionalDate, timeSchema, tripDateSchema } from '../utils/validation';
import { formatDate, formatDistance } from '../utils/format';
```

- [ ] **Step 2: Relax the `date` schema field**

Change (around line 27-33):

```tsx
const schema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  date: tripDateSchema,
  time: timeSchema,
  service_level: z.string().optional(),
});
```

to:

```tsx
const schema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  date: optionalDate,
  time: timeSchema,
  service_level: z.string().optional(),
});
```

(`tripDateSchema` stays imported — it's reused for a manual check in Step 5.)

- [ ] **Step 3: Add the `bookingDate` prop**

Change (around line 39-46):

```tsx
interface TripDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  bookingRef: string;
  trip?: Trip; // required for edit
  services?: ServiceLevel[]; // for add-mode service_level select
}
```

to:

```tsx
interface TripDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  bookingRef: string;
  trip?: Trip; // required for edit
  services?: ServiceLevel[]; // for add-mode service_level select
  bookingDate?: string | null; // add-mode: the booking's existing trip date, if it has any trips
}
```

Change (line 51) from:

```tsx
export function TripDialog({ open, onClose, mode, bookingRef, trip, services = [] }: TripDialogProps) {
```

to:

```tsx
export function TripDialog({ open, onClose, mode, bookingRef, trip, services = [], bookingDate = null }: TripDialogProps) {
```

Right after the existing `const [formError, setFormError] = useState<string[]>([]);` line, add:

```tsx
  // A booking's date is fixed once it has any trips; only a booking with zero
  // trips (everything on it was cancelled) still needs a date picker here.
  const needsDatePicker = mode === 'add' && !bookingDate;
  const lockedDate = mode === 'edit' ? trip?.date ?? null : bookingDate;
```

- [ ] **Step 4: Stop deriving the form's `date` default from the trip**

Change (around line 57-66):

```tsx
  const defaults = useMemo<TripFormValues>(
    () => ({
      pick_up_address: trip?.pick_up_address ?? '',
      drop_off_address: trip?.drop_off_address ?? '',
      date: (trip?.date ? dayjs(trip.date) : null) as never,
      time: (trip?.time ? dayjs(`2000-01-01T${trip.time}`) : null) as never,
      service_level: services[0]?.code ?? '',
    }),
    [trip, services],
  );
```

to:

```tsx
  const defaults = useMemo<TripFormValues>(
    () => ({
      pick_up_address: trip?.pick_up_address ?? '',
      drop_off_address: trip?.drop_off_address ?? '',
      date: null,
      time: (trip?.time ? dayjs(`2000-01-01T${trip.time}`) : null) as never,
      service_level: services[0]?.code ?? '',
    }),
    [trip, services],
  );
```

- [ ] **Step 5: Stop submitting a form-controlled date except in the fallback picker case**

Change (around line 83-108):

```tsx
  const onSubmit = handleSubmit(async (values) => {
    setFormError([]);
    const base = {
      pick_up_address: values.pick_up_address.trim(),
      drop_off_address: values.drop_off_address.trim(),
      date: dayjs(values.date).format(API_DATE),
      time: dayjs(values.time).format(API_TIME),
    };
    try {
      if (mode === 'edit' && trip) {
        await editTrip.mutateAsync({ uuid: trip.uuid, input: base });
        toast.success('Trip updated');
      } else {
        await addTrip.mutateAsync({
          ...base,
          service_level: values.service_level || undefined,
        });
        toast.success('Trip added');
      }
      onClose();
    } catch (err) {
      const { detail, unmapped } = applyServerFieldErrors(err, setError, FIELDS);
      const msgs = [detail, ...unmapped].filter(Boolean) as string[];
      setFormError(msgs.length ? msgs : ['Could not save the trip. Please try again.']);
    }
  });
```

to:

```tsx
  const onSubmit = handleSubmit(async (values) => {
    setFormError([]);
    const logistics = {
      pick_up_address: values.pick_up_address.trim(),
      drop_off_address: values.drop_off_address.trim(),
      time: dayjs(values.time).format(API_TIME),
    };
    try {
      if (mode === 'edit' && trip) {
        await editTrip.mutateAsync({ uuid: trip.uuid, input: logistics });
        toast.success('Trip updated');
      } else {
        let date = bookingDate ?? '';
        if (needsDatePicker) {
          const result = tripDateSchema.safeParse(values.date);
          if (!result.success) {
            setError('date', { type: 'validate', message: result.error.issues[0]?.message ?? 'Date is required' });
            return;
          }
          date = dayjs(values.date).format(API_DATE);
        }
        await addTrip.mutateAsync({
          ...logistics,
          date,
          service_level: values.service_level || undefined,
        });
        toast.success('Trip added');
      }
      onClose();
    } catch (err) {
      const { detail, unmapped } = applyServerFieldErrors(err, setError, FIELDS);
      const msgs = [detail, ...unmapped].filter(Boolean) as string[];
      setFormError(msgs.length ? msgs : ['Could not save the trip. Please try again.']);
    }
  });
```

- [ ] **Step 6: Render read-only text instead of a picker when the date is locked**

Change (around line 134-137):

```tsx
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <FormDatePicker control={control} name="date" label="Date" disablePast />
              <FormTimePicker control={control} name="time" label="Time" />
            </Stack>
```

to:

```tsx
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {needsDatePicker ? (
                <FormDatePicker control={control} name="date" label="Date" disablePast />
              ) : (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(lockedDate)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Set by the booking's date — not editable here
                  </Typography>
                </Box>
              )}
              <FormTimePicker control={control} name="time" label="Time" />
            </Stack>
```

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Run: `npm run dev`, open any booking with at least one trip.

1. Click **Edit** on a trip. Confirm the Date field is now read-only text showing that trip's date, captioned "Set by the booking's date — not editable here." Change the pickup address only, save, confirm success and that the trip's date is unchanged.
2. Click **Add trip**. Confirm the Date field is still an editable picker for now (expected — Task 3 wires the lock into this dialog). Fill it in and submit to confirm the add flow still works end to end.

- [ ] **Step 9: Commit**

```bash
git add src/components/TripDialog.tsx
git commit -m "feat: make trip date read-only in the trip dialog"
```

---

### Task 3: Wire the booking's date into the Add-trip dialog

**Files:**
- Modify: `src/pages/bookings/BookingDetailPage.tsx`

**Interfaces:**
- Consumes: `TripDialog`'s `bookingDate?: string | null` prop (from Task 2); `data.trips` from `useBooking(ref)` (`BookingDetail.trips: Trip[]`, unchanged).
- Produces: nothing consumed elsewhere.

This is the step that actually activates the date lock for Add mode: it hands the booking's existing date to the dialog added in Task 2.

- [ ] **Step 1: Pass `bookingDate` to the Add-trip dialog**

Change (around line 324-331):

```tsx
      {/* Add trip */}
      <TripDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
        bookingRef={data.ref}
        services={servicesQuery.data?.services ?? []}
      />
```

to:

```tsx
      {/* Add trip */}
      <TripDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
        bookingRef={data.ref}
        services={servicesQuery.data?.services ?? []}
        bookingDate={data.trips[0]?.date ?? null}
      />
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Run: `npm run dev`.

1. Open a booking that has at least one trip. Click **Add trip**. Confirm the Date field is now **read-only text** matching the booking's existing trip date, captioned "Set by the booking's date — not editable here." Fill in pickup/drop-off/time/service level and submit; confirm the new trip is created with that same date.
2. Find or create a booking, then cancel every trip on it until it shows the "No trips on this booking" empty state. Click **Add trip** (from the empty state). Confirm the Date field is now an **editable picker** (today-or-later), matching today's original behavior. Pick a date, fill in the rest, and submit; confirm the trip is created with the date you picked.

- [ ] **Step 4: Commit**

```bash
git add src/pages/bookings/BookingDetailPage.tsx
git commit -m "feat: lock add-trip date to the booking's existing trip date"
```
