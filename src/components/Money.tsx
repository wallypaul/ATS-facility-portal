import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { MONO } from '../theme';
import { formatMoney } from '../utils/format';

// Money renders in IBM Plex Mono with tabular numerals so columns align and it
// never reads as prose. Server-sourced and read-only by definition here.
export function Money({
  value,
  sx,
  emphasis = false,
}: {
  value: string | number | null | undefined;
  sx?: SxProps<Theme>;
  emphasis?: boolean;
}) {
  return (
    <Box
      component="span"
      sx={{
        fontFamily: MONO,
        fontVariantNumeric: 'tabular-nums',
        fontWeight: emphasis ? 600 : 500,
        whiteSpace: 'nowrap',
        ...sx,
      }}
    >
      {formatMoney(value)}
    </Box>
  );
}
