import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { useBookings } from '../../query/hooks';
import { formatDateTime } from '../../utils/format';
import { MONO } from '../../theme';
import type { BookingListItem } from '../../api/types';

export function BookingsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useBookings();

  const showPayer = useMemo(() => {
    const names = new Set((data ?? []).map((b) => b.payer).filter(Boolean));
    return names.size > 1;
  }, [data]);

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
      <DataTable<BookingListItem>
        aria-label="Bookings"
        rows={data}
        columns={columns}
        getRowId={(row) => row.ref}
        loading={isLoading}
        error={isError ? error : undefined}
        onRetry={refetch}
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
