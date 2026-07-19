import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import dayjs, { type Dayjs } from 'dayjs';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { FilterBar } from '../../components/FilterBar';
import { useInvoices } from '../../query/hooks';
import { formatDate } from '../../utils/format';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { API_DATE } from '../../utils/validation';
import { MONO } from '../../theme';
import type { InvoiceFilters } from '../../api/payer';
import type { InvoiceListItem } from '../../api/types';

// Outstanding balance a payer still owes on an invoice (no server field for it).
const outstanding = (row: InvoiceListItem) => Number(row.total_amount) - Number(row.amount_paid);

export function InvoicesPage() {
  const [date, setDate] = useState<Dayjs>(() => dayjs());
  const [invoiceIdInput, setInvoiceIdInput] = useState('');
  const invoiceId = useDebouncedValue(invoiceIdInput);

  const filters = useMemo<InvoiceFilters>(() => {
    const f: InvoiceFilters = { date: date.format(API_DATE) };
    if (invoiceId) f.invoice_id = invoiceId;
    return f;
  }, [date, invoiceId]);

  const hasClearableFilters = Boolean(invoiceIdInput || !date.isSame(dayjs(), 'day'));
  const clearFilters = () => {
    setDate(dayjs());
    setInvoiceIdInput('');
  };

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 50,
  });

  // A new filter set is a new result set — jump back to the first page.
  useEffect(() => {
    setPaginationModel((m) => ({ ...m, page: 0 }));
  }, [filters]);

  const { data, isLoading, isFetching, isError, error, refetch } = useInvoices(filters, {
    page: paginationModel.page + 1, // grid is 0-based, API is 1-based
    page_size: paginationModel.pageSize,
  });
  const rows = data?.results;
  const rowCount = data?.count ?? 0;

  // If the current page falls past the end (e.g. rows removed), step back.
  useEffect(() => {
    if (!data) return;
    const lastPage = Math.max(0, Math.ceil(data.count / paginationModel.pageSize) - 1);
    if (paginationModel.page > lastPage) {
      setPaginationModel((m) => ({ ...m, page: lastPage }));
    }
  }, [data, paginationModel.page, paginationModel.pageSize]);

  const columns = useMemo<GridColDef<InvoiceListItem>[]>(
    () => [
      {
        field: 'invoice_number',
        headerName: 'Invoice',
        width: 200,
        renderCell: (p) => (
          <Ref value={p.row.invoice_number} to={`/invoices/${p.row.uuid}`} label="invoice number" />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => <StatusChip status={p.row.status} />,
      },
      {
        field: 'outstanding',
        headerName: 'Outstanding',
        width: 150,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (_v, row) => outstanding(row),
        renderCell: (p) => {
          const status = String(p.row.status ?? '').toUpperCase();
          const balance = outstanding(p.row);
          // Void invoices owe nothing — mute them. A cleared balance reads as a
          // quiet, resolved "Paid". Only a real balance gets the amber money color.
          if (status === 'VOID') {
            return <Box component="span" sx={{ color: 'text.disabled' }}>—</Box>;
          }
          if (balance <= 0) {
            return (
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: 'success.main',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 15 }} /> Paid
              </Box>
            );
          }
          return <Money value={balance} emphasis sx={{ color: 'secondary.main' }} />;
        },
      },
      {
        field: 'total_amount',
        headerName: 'Total',
        width: 120,
        align: 'right',
        headerAlign: 'right',
        sortComparator: (a, b) => Number(a ?? 0) - Number(b ?? 0),
        renderCell: (p) => <Money value={p.row.total_amount} />,
      },
      {
        field: 'invoice_date',
        headerName: 'Issued',
        width: 130,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
            {formatDate(p.row.invoice_date)}
          </Box>
        ),
      },
      {
        field: 'due_date',
        headerName: 'Due',
        width: 130,
        renderCell: (p) =>
          p.row.due_date ? (
            <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
              {formatDate(p.row.due_date)}
            </Box>
          ) : (
            <Box component="span" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              On receipt
            </Box>
          ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader
        title="Invoices"
        subtitle="Invoices billed to your facility. Open one to review line items or pay online."
      />
      <FilterBar onClear={clearFilters} hasClearableFilters={hasClearableFilters}>
        <DatePicker
          label="Date"
          value={date}
          onChange={(v) => v && setDate(v)}
          slotProps={{ textField: { size: 'small', required: true, sx: { width: 170 } } }}
        />
        <TextField
          label="Invoice ID"
          size="small"
          value={invoiceIdInput}
          onChange={(e) => setInvoiceIdInput(e.target.value)}
          sx={{ width: 190 }}
        />
      </FilterBar>
      <DataTable<InvoiceListItem>
        aria-label="Invoices"
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
        initialState={{ sorting: { sortModel: [{ field: 'invoice_date', sort: 'desc' }] } }}
        empty={{
          title: hasClearableFilters ? 'No invoices match these filters' : 'No invoices on this date',
          description: hasClearableFilters
            ? 'Try a different date or clearing the filters.'
            : 'When ATS bills your facility, invoices will show up here.',
        }}
      />
    </Box>
  );
}
