import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { GridActionsCellItem, type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ClearIcon from '@mui/icons-material/Clear';
import dayjs, { type Dayjs } from 'dayjs';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TripDialog } from '../../components/TripDialog';
import { FilterBar } from '../../components/FilterBar';
import { useToast } from '../../components/ToastProvider';
import { useTrips, useCancelTrip } from '../../query/hooks';
import type { TripFilters } from '../../api/payer';
import { parseApiError } from '../../utils/errors';
import { canEditTrip, formatDate, formatDistance, formatTime, tripStatus } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { API_DATE } from '../../utils/validation';
import { MONO } from '../../theme';
import type { Trip } from '../../api/types';

export function TripsPage() {
  const toast = useToast();
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const bookingId = useDebouncedValue(bookingIdInput);
  const patientName = useDebouncedValue(patientNameInput);
  const pickup = useDebouncedValue(pickupInput);
  const dropoff = useDebouncedValue(dropoffInput);

  const [editing, setEditing] = useState<Trip | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Trip | null>(null);

  const filters = useMemo<TripFilters>(() => {
    const f: TripFilters = { date: date.format(API_DATE) };
    if (bookingId) f.booking_id = bookingId;
    if (patientName) f.patient_name = patientName;
    if (pickup) f.pickup = pickup;
    if (dropoff) f.dropoff = dropoff;
    return f;
  }, [date, bookingId, patientName, pickup, dropoff]);

  const hasClearableFilters = Boolean(
    bookingIdInput || patientNameInput || pickupInput || dropoffInput || !date.isSame(dayjs(), 'day'),
  );
  const clearFilters = () => {
    setDate(dayjs());
    setBookingIdInput('');
    setPatientNameInput('');
    setPickupInput('');
    setDropoffInput('');
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });

  // A new filter set is a new result set — jump back to the first page.
  useEffect(() => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, [filters]);

  const { data, isLoading, isFetching, isError, error, refetch } = useTrips(filters, {
    page: paginationModel.page + 1, // grid is 0-based, API is 1-based
    page_size: paginationModel.pageSize,
  });
  const rows = data?.results;
  const rowCount = data?.count ?? 0;
  const cancelTrip = useCancelTrip();

  // If the current page falls past the end (e.g. trips cancelled), step back.
  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(0, Math.ceil(data.count / paginationModel.pageSize) - 1);
    if (paginationModel.page > lastPage) {
      setPaginationModel((m) => ({ ...m, page: lastPage }));
    }
  }, [data, paginationModel.page, paginationModel.pageSize]);

  // Server returns trips newest-first (-date,-time) and we page server-side, so a
  // client column sort would only reorder the visible page — disable it and trust
  // the server order. Status is derived from which actuals the driver has recorded.
  const mono = (value: string) => (
    <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Box>
  );

  const columns = useMemo<GridColDef<Trip>[]>(
    () => [
      {
        field: 'booking_ref',
        headerName: 'Booking',
        width: 180,
        sortable: false,
        renderCell: (p) =>
          p.row.booking_ref ? (
            <Ref value={p.row.booking_ref} to={`/bookings/${encodeURIComponent(p.row.booking_ref)}`} label="booking ref" />
          ) : (
            '—'
          ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        sortable: false,
        renderCell: (p) => <StatusChip status={tripStatus(p.row)} />,
      },
      { field: 'pick_up_address', headerName: 'Pickup', flex: 1, minWidth: 160, sortable: false },
      { field: 'drop_off_address', headerName: 'Drop-off', flex: 1, minWidth: 160, sortable: false },
      {
        field: 'date',
        headerName: 'Date',
        width: 120,
        sortable: false,
        renderCell: (p) => mono(formatDate(p.row.date)),
      },
      {
        field: 'time',
        headerName: 'Time',
        width: 100,
        sortable: false,
        renderCell: (p) => mono(formatTime(p.row.time)),
      },
      {
        field: 'price',
        headerName: 'Fare',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        renderCell: (p) => <Money value={p.row.price} />,
      },
      {
        field: 'distance',
        headerName: 'Miles',
        width: 110,
        align: 'right',
        headerAlign: 'right',
        sortable: false,
        renderCell: (p) => mono(formatDistance(p.row.distance)),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 96,
        getActions: (p) => {
          const editable = canEditTrip(p.row);
          return [
            <GridActionsCellItem
              key="edit"
              icon={<EditOutlinedIcon />}
              label={editable ? 'Edit' : 'Locked — pickup already recorded'}
              disabled={!editable}
              onClick={() => setEditing(p.row)}
            />,
            <GridActionsCellItem
              key="cancel"
              icon={<DeleteOutlineIcon />}
              label="Cancel"
              onClick={() => setConfirmCancel(p.row)}
              showInMenu={false}
            />,
          ];
        },
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
      <PageHeader
        title="Trips"
        subtitle="All trips for your facility — most recent first."
      />

      <FilterBar onClear={clearFilters} hasClearableFilters={hasClearableFilters}>
        <DatePicker
          label="Date"
          value={date}
          onChange={(v) => v && setDate(v)}
          slotProps={{ textField: { size: 'small', required: true, sx: { width: 170 } } }}
        />
        <TextField
          label="Booking ID"
          size="small"
          value={bookingIdInput}
          onChange={(e) => setBookingIdInput(e.target.value)}
          sx={{ width: 170 }}
        />
        <TextField
          label="Patient name"
          size="small"
          value={patientNameInput}
          onChange={(e) => setPatientNameInput(e.target.value)}
          sx={{ width: 190 }}
        />
        <TextField
          label="Pickup"
          size="small"
          value={pickupInput}
          onChange={(e) => setPickupInput(e.target.value)}
          sx={{ width: 170 }}
        />
        <TextField
          label="Drop-off"
          size="small"
          value={dropoffInput}
          onChange={(e) => setDropoffInput(e.target.value)}
          sx={{ width: 170 }}
        />
      </FilterBar>

      <DataTable<Trip>
        aria-label="Trips"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={isLoading || isFetching}
        error={isError ? error : undefined}
        onRetry={refetch}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        empty={{
          title: hasClearableFilters ? 'No trips match these filters' : 'No trips on this date',
          description: hasClearableFilters
            ? 'Try a different date or clearing the filters.'
            : 'Trips you book will appear here.',
          action: hasClearableFilters ? (
            <Button variant="outlined" onClick={clearFilters} startIcon={<ClearIcon />}>
              Clear filters
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
              )} at ${formatTime(confirmCancel.time)}. This can't be undone.`
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
