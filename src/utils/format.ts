import dayjs from 'dayjs';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const EM_DASH = '—';

export function formatMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EM_DASH;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return EM_DASH;
  return usd.format(n);
}

// Date-only "YYYY-MM-DD" -> "08/01/2026"
export function formatDate(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(value);
  return d.isValid() ? d.format('MM/DD/YYYY') : value;
}

// Datetime ISO -> "08/01/2026, 10:00 AM"
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(value);
  return d.isValid() ? d.format('MM/DD/YYYY, h:mm A') : value;
}

// "HH:mm:ss" or "HH:mm" -> "10:00 AM"
export function formatTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(`2000-01-01T${value}`);
  return d.isValid() ? d.format('h:mm A') : value;
}

// Short table-column preview of a longer string, e.g. an address — full value
// still available via the caller's tooltip/title.
export function truncate(value: string | null | undefined, length = 5): string {
  if (!value) return EM_DASH;
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

export function formatDistance(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EM_DASH;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return EM_DASH;
  return `${n.toFixed(1)} miles`;
}

// A payer trip carries only actuals, so its lifecycle is inferred from which the
// driver has recorded: none yet -> scheduled, pickup only -> in progress, both ->
// completed. Strings match StatusChip's tone map (scheduled=amber, completed=green).
export function tripStatus(trip: {
  actual_pick_up_time: string | null;
  actual_drop_off_time: string | null;
}): 'scheduled' | 'in progress' | 'completed' {
  if (trip.actual_drop_off_time) return 'completed';
  if (trip.actual_pick_up_time) return 'in progress';
  return 'scheduled';
}

// Once the driver has recorded a pickup (address or time), the trip is under way,
// so a payer can no longer edit its planned logistics.
export function canEditTrip(trip: {
  actual_pick_up_address: string | null;
  actual_pick_up_time: string | null;
}): boolean {
  return !trip.actual_pick_up_address && !trip.actual_pick_up_time;
}
