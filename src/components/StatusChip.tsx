import Chip from '@mui/material/Chip';
import type { ChipProps } from '@mui/material/Chip';

type Tone = 'attention' | 'success' | 'error' | 'neutral';

// Map any booking / trip / invoice / payment status string to a semantic tone.
// received / pending / draft / sent -> amber attention; confirmed / paid -> success;
// cancelled / denied / void -> error; unknown -> neutral. Color is never the only
// signal — the chip always carries the label text.
const TONE_BY_STATUS: Record<string, Tone> = {
  // attention (amber)
  received: 'attention',
  pending: 'attention',
  requested: 'attention',
  scheduled: 'attention',
  draft: 'attention',
  sent: 'attention',
  submitted: 'attention',
  partial: 'attention',
  unpaid: 'attention',
  // success (green)
  confirmed: 'success',
  completed: 'success',
  active: 'success',
  paid: 'success',
  // error (red)
  cancelled: 'error',
  canceled: 'error',
  denied: 'error',
  rejected: 'error',
  void: 'error',
  expired: 'error',
  exhausted: 'error',
  failed: 'error',
};

const CHIP_COLOR: Record<Tone, ChipProps['color']> = {
  attention: 'secondary',
  success: 'success',
  error: 'error',
  neutral: 'default',
};

function prettify(status: string): string {
  return status
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function StatusChip({
  status,
  size = 'small',
}: {
  status: string | null | undefined;
  size?: ChipProps['size'];
}) {
  const raw = (status ?? '').toString().trim();
  const tone = TONE_BY_STATUS[raw.toLowerCase()] ?? 'neutral';
  const label = raw ? prettify(raw) : 'Unknown';
  return (
    <Chip
      size={size}
      label={label}
      color={CHIP_COLOR[tone]}
      variant={tone === 'neutral' ? 'outlined' : 'filled'}
      sx={{ letterSpacing: '0.01em' }}
    />
  );
}
