import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';

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
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });
  const { data, isLoading, isFetching, isError, error, refetch } = useBookings({
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
