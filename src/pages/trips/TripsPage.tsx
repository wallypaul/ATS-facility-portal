import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { GridActionsCellItem, type GridColDef } from '@mui/x-data-grid';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import { type Dayjs } from 'dayjs';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TripDialog } from '../../components/TripDialog';
import { useToast } from '../../components/ToastProvider';
import { useTrips, useCancelTrip } from '../../query/hooks';
import type { TripFilters } from '../../api/payer';
import { parseApiError } from '../../utils/errors';
import { formatDate, formatDistance, formatTime } from '../../utils/format';
import { API_DATE } from '../../utils/validation';
import { MONO } from '../../theme';
import type { Trip } from '../../api/types';

export function TripsPage() {
  const toast = useToast();
  const [from, setFrom] = useState<Dayjs | null>(null);
  const [to, setTo] = useState<Dayjs | null>(null);
  const [exact, setExact] = useState<Dayjs | null>(null);

  const [editing, setEditing] = useState<Trip | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Trip | null>(null);

  const filters = useMemo<TripFilters>(() => {
    if (exact) return { date: exact.format(API_DATE) };
    const f: TripFilters = {};
    if (from) f.from = from.format(API_DATE);
    if (to) f.to = to.format(API_DATE);
    return f;
  }, [from, to, exact]);

  const { data, isLoading, isFetching, isError, error, refetch } = useTrips(filters);
  const cancelTrip = useCancelTrip();

  const hasFilters = Boolean(from || to || exact);
  const clear = () => {
    setFrom(null);
    setTo(null);
    setExact(null);
  };

  const columns = useMemo<GridColDef<Trip>[]>(
    () => [
      {
        field: 'booking_ref',
        headerName: 'Booking',
        width: 190,
        renderCell: (p) =>
          p.row.booking_ref ? (
            <Ref value={p.row.booking_ref} to={`/bookings/${encodeURIComponent(p.row.booking_ref)}`} label="booking ref" />
          ) : (
            '—'
          ),
      },
      { field: 'pick_up_address', headerName: 'Pickup', flex: 1, minWidth: 160 },
      { field: 'drop_off_address', headerName: 'Drop-off', flex: 1, minWidth: 160 },
      {
        field: 'date',
        headerName: 'Date',
        width: 130,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
            {formatDate(p.row.date)}
          </Box>
        ),
      },
      {
        field: 'time',
        headerName: 'Time',
        width: 100,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
            {formatTime(p.row.time)}
          </Box>
        ),
      },
      {
        field: 'price',
        headerName: 'Price',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        sortComparator: (a, b) => Number(a ?? 0) - Number(b ?? 0),
        renderCell: (p) => <Money value={p.row.price} />,
      },
      {
        field: 'distance',
        headerName: 'Distance',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        sortComparator: (a, b) => Number(a ?? 0) - Number(b ?? 0),
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums', fontSize: '0.8125rem' }}>
            {formatDistance(p.row.distance)}
          </Box>
        ),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 96,
        getActions: (p) => [
          <GridActionsCellItem
            key="edit"
            icon={<EditOutlinedIcon />}
            label="Edit"
            onClick={() => setEditing(p.row)}
          />,
          <GridActionsCellItem
            key="cancel"
            icon={<DeleteOutlineIcon />}
            label="Cancel"
            onClick={() => setConfirmCancel(p.row)}
            showInMenu={false}
          />,
        ],
      },
    ],
    [],
  );

  const doCancel = () => {
    if (!confirmCancel) return;
    cancelTrip.mutate(
      { uuid: confirmCancel.uuid },
      {
        onSuccess: () => toast.success('Trip cancelled'),
        onError: (err) => toast.error(parseApiError(err).detail ?? 'Could not cancel the trip.'),
        onSettled: () => setConfirmCancel(null),
      },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader title="Trips" subtitle="All scheduled trips for your facility." />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ gap: 2, alignItems: { md: 'flex-end' }, flexWrap: 'wrap' }}
        >
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              Date range
            </Typography>
            <Stack direction="row" sx={{ gap: 1.5 }}>
              <DatePicker
                label="From"
                value={from}
                onChange={setFrom}
                disabled={Boolean(exact)}
                maxDate={to ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
              />
              <DatePicker
                label="To"
                value={to}
                onChange={setTo}
                disabled={Boolean(exact)}
                minDate={from ?? undefined}
                slotProps={{ textField: { size: 'small', sx: { width: 170 } } }}
              />
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', mb: 0.5, display: 'block' }}>
              Or a single day (overrides range)
            </Typography>
            <DatePicker
              label="On date"
              value={exact}
              onChange={setExact}
              slotProps={{
                textField: { size: 'small', sx: { width: 170 } },
                field: { clearable: true },
              }}
            />
          </Box>
          {hasFilters && (
            <Button onClick={clear} startIcon={<ClearIcon />} color="inherit" sx={{ mb: 0.25 }}>
              Clear
            </Button>
          )}
        </Stack>
      </Card>

      <DataTable<Trip>
        aria-label="Trips"
        rows={data}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={isLoading || isFetching}
        error={isError ? error : undefined}
        onRetry={refetch}
        initialState={{ sorting: { sortModel: [{ field: 'date', sort: 'desc' }] } }}
        empty={{
          title: hasFilters ? 'No trips in this range' : 'No trips yet',
          description: hasFilters
            ? 'Try widening the date range or clearing the filter.'
            : 'Trips you book will appear here.',
          action: hasFilters ? (
            <Button variant="outlined" onClick={clear} startIcon={<ClearIcon />}>
              Clear filter
            </Button>
          ) : undefined,
        }}
      />

      {editing && (
        <TripDialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          mode="edit"
          bookingRef={editing.booking_ref}
          trip={editing}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirmCancel)}
        title="Cancel this trip?"
        message={
          confirmCancel
            ? `${confirmCancel.pick_up_address} → ${confirmCancel.drop_off_address} on ${formatDate(
                confirmCancel.date,
              )}. This can't be undone.`
            : ''
        }
        confirmLabel="Cancel trip"
        cancelLabel="Keep trip"
        destructive
        busy={cancelTrip.isPending}
        onConfirm={doCancel}
        onClose={() => setConfirmCancel(null)}
      />
    </Box>
  );
}
