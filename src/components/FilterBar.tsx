import { useState, type ReactNode } from 'react';
import Card from '@mui/material/Card';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ClearIcon from '@mui/icons-material/Clear';

// Collapsed-by-default filter shell shared by Bookings/Trips/Invoices. Fields
// go in as children; the caller owns filter state and clearing.
export function FilterBar({
  children,
  onClear,
  hasClearableFilters,
}: {
  children: ReactNode;
  onClear?: () => void;
  hasClearableFilters?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card sx={{ mb: 2 }}>
      <Stack
        direction="row"
        onClick={() => setOpen((o) => !o)}
        sx={{ alignItems: 'center', gap: 1, p: 1.5, cursor: 'pointer' }}
      >
        <FilterListIcon fontSize="small" sx={{ color: 'text.secondary' }} />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          Filters
        </Typography>
        {onClear && hasClearableFilters && (
          <Button
            size="small"
            color="inherit"
            startIcon={<ClearIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            Clear
          </Button>
        )}
        <IconButton
          size="small"
          aria-label={open ? 'Collapse filters' : 'Expand filters'}
          sx={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Stack>
      <Collapse in={open}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 2, alignItems: { md: 'flex-end' }, flexWrap: 'wrap', p: 2, pt: 0 }}
        >
          {children}
        </Stack>
      </Collapse>
    </Card>
  );
}
