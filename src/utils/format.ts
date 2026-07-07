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

// Date-only "YYYY-MM-DD" -> "Aug 1, 2026"
export function formatDate(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(value);
  return d.isValid() ? d.format('MMM D, YYYY') : value;
}

// Datetime ISO -> "Aug 1, 2026, 10:00 AM"
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(value);
  return d.isValid() ? d.format('MMM D, YYYY, h:mm A') : value;
}

// "HH:mm:ss" or "HH:mm" -> "10:00 AM"
export function formatTime(value: string | null | undefined): string {
  if (!value) return EM_DASH;
  const d = dayjs(`2000-01-01T${value}`);
  return d.isValid() ? d.format('h:mm A') : value;
}

export function formatDistance(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EM_DASH;
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return EM_DASH;
  return `${n.toFixed(1)} mi`;
}
