import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddIcon from '@mui/icons-material/Add';
import dayjs, { type Dayjs } from 'dayjs';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { FilterBar } from '../../components/FilterBar';
import { useBookings } from '../../query/hooks';
import { formatDateTime, truncate } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { API_DATE } from '../../utils/validation';
import { MONO } from '../../theme';
import type { BookingFilters } from '../../api/payer';
import type { BookingListItem } from '../../api/types';

// Non-exhaustive suggestions — the field is freeSolo, so any status text can
// be typed; there's no canonical status enum available to validate against.
const STATUS_SUGGESTIONS = ['received', 'accepted', 'confirmed', 'cancelled'];
const PAYMENT_STATUS_SUGGESTIONS = ['pending', 'partial', 'paid', 'unpaid'];

export function BookingsPage() {
  const navigate = useNavigate();

  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [bookingIdInput, setBookingIdInput] = useState('');
  const [patientNameInput, setPatientNameInput] = useState('');
  const [status, setStatus] = useState<string[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<string[]>([]);
  const bookingId = useDebouncedValue(bookingIdInput);
  const patientName = useDebouncedValue(patientNameInput);

  const filters = useMemo<BookingFilters>(() => {
    const f: BookingFilters = { date: date.format(API_DATE) };
    if (bookingId) f.booking_id = bookingId;
    if (patientName) f.patient_name = patientName;
    if (status.length) f.status = status;
    if (paymentStatus.length) f.payment_status = paymentStatus;
    return f;
  }, [date, bookingId, patientName, status, paymentStatus]);

  const hasClearableFilters = Boolean(
    bookingIdInput || patientNameInput || status.length || paymentStatus.length || !date.isSame(dayjs(), 'day'),
  );
  const clearFilters = () => {
    setDate(dayjs());
    setBookingIdInput('');
    setPatientNameInput('');
    setStatus([]);
    setPaymentStatus([]);
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });

  // A new filter set is a new result set — jump back to the first page.
  useEffect(() => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, [filters]);

  const { data, isLoading, isFetching, isError, error, refetch } = useBookings(filters, {
    page: paginationModel.page + 1, // grid is 0-based, API is 1-based
    page_size: paginationModel.pageSize,
  });
  const rows = data?.results;
  const rowCount = data?.count ?? 0;

  // If the current page falls past the end (e.g. bookings were removed), step back.
  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(0, Math.ceil(data.count / paginationModel.pageSize) - 1);
    if (paginationModel.page > lastPage) {
      setPaginationModel((m) => ({ ...m, page: lastPage }));
    }
  }, [data, paginationModel.page, paginationModel.pageSize]);

  // We can only see the current page now, so detect multi-payer stickily: once a
  // page shows more than one payer, keep the column for the session.
  // ponytail: a server "is_multi_payer" flag would make this exact; not worth a round-trip.
  const [showPayer, setShowPayer] = useState(false);
  useEffect(() => {
    if (!rows) return;
    const names = new Set(rows.map((b) => b.payer).filter(Boolean));
    if (names.size > 1) setShowPayer(true);
  }, [rows]);

  const columns = useMemo<GridColDef<BookingListItem>[]>(() => {
    const cols: GridColDef<BookingListItem>[] = [
      {
        field: 'ref',
        headerName: 'Reference',
        width: 200,
        renderCell: (p) => <Ref value={p.row.ref} to={`/bookings/${encodeURIComponent(p.row.ref)}`} label="booking ref" />,
      },
      { field: 'passenger_name', headerName: 'Patient', flex: 1, minWidth: 160 },
      {
        field: 'first_trip_pickup',
        headerName: 'Pickup',
        width: 100,
        sortable: false,
        renderCell: (p) => <span title={p.row.first_trip_pickup ?? ''}>{truncate(p.row.first_trip_pickup)}</span>,
      },
      {
        field: 'first_trip_dropoff',
        headerName: 'Drop-off',
        width: 100,
        sortable: false,
        renderCell: (p) => <span title={p.row.first_trip_dropoff ?? ''}>{truncate(p.row.first_trip_dropoff)}</span>,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (p) => <StatusChip status={p.row.status} />,
      },
      {
        field: 'payment_status',
        headerName: 'Payment',
        width: 130,
        renderCell: (p) => <StatusChip status={p.row.payment_status} />,
      },
      {
        field: 'trips_count',
        headerName: 'Trips',
        width: 90,
        align: 'center',
        headerAlign: 'center',
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
            {p.row.trips_count}
          </Box>
        ),
      },
      {
        field: 'created_at',
        headerName: 'Created',
        width: 190,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem', color: 'text.secondary' }}>
            {formatDateTime(p.row.created_at)}
          </Box>
        ),
      },
    ];
    if (showPayer) {
      cols.push({ field: 'payer', headerName: 'Payer', flex: 1, minWidth: 140 });
    }
    return cols;
  }, [showPayer]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        title="Bookings"
        subtitle="Every booking for your facility, newest first."
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/book')}>
            Book a trip
          </Button>
        }
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
        <Autocomplete
          multiple
          freeSolo
          options={STATUS_SUGGESTIONS}
          value={status}
          onChange={(_e, v) => setStatus(v)}
          renderInput={(params) => <TextField {...params} label="Status" size="small" />}
          sx={{ width: 220 }}
        />
        <Autocomplete
          multiple
          freeSolo
          options={PAYMENT_STATUS_SUGGESTIONS}
          value={paymentStatus}
          onChange={(_e, v) => setPaymentStatus(v)}
          renderInput={(params) => <TextField {...params} label="Payment status" size="small" />}
          sx={{ width: 220 }}
        />
      </FilterBar>
      <DataTable<BookingListItem>
        aria-label="Bookings"
        rows={rows}
        columns={columns}
        getRowId={(row) => row.ref}
        loading={isLoading || isFetching}
        error={isError ? error : undefined}
        onRetry={refetch}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        initialState={{ sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] } }}
        empty={{
          title: 'No bookings yet',
          description: 'Book your first patient trip to see it here.',
          action: (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/book')}>
              Book a trip
            </Button>
          ),
        }}
      />
    </Box>
  );
}
