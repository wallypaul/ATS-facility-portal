import { useMemo } from 'react';
import Box from '@mui/material/Box';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '../../components/PageHeader';
import { DataTable } from '../../components/DataTable';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { useInvoices } from '../../query/hooks';
import { formatDate } from '../../utils/format';
import { MONO } from '../../theme';
import type { InvoiceListItem } from '../../api/types';

export function InvoicesPage() {
  const { data, isLoading, isError, error, refetch } = useInvoices();

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
        width: 130,
        renderCell: (p) => <StatusChip status={p.row.status} />,
      },
      {
        field: 'invoice_date',
        headerName: 'Issued',
        width: 140,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
            {formatDate(p.row.invoice_date)}
          </Box>
        ),
      },
      {
        field: 'due_date',
        headerName: 'Due',
        width: 140,
        renderCell: (p) => (
          <Box component="span" sx={{ fontFamily: MONO, fontSize: '0.8125rem' }}>
            {formatDate(p.row.due_date)}
          </Box>
        ),
      },
      {
        field: 'total_amount',
        headerName: 'Total',
        width: 130,
        align: 'right',
        headerAlign: 'right',
        sortComparator: (a, b) => Number(a ?? 0) - Number(b ?? 0),
        renderCell: (p) => <Money value={p.row.total_amount} emphasis />,
      },
      {
        field: 'amount_paid',
        headerName: 'Paid',
        width: 130,
        align: 'right',
        headerAlign: 'right',
        sortComparator: (a, b) => Number(a ?? 0) - Number(b ?? 0),
        renderCell: (p) => <Money value={p.row.amount_paid} />,
      },
    ],
    [],
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <PageHeader title="Invoices" subtitle="Invoices billed to your facility. Read-only." />
      <DataTable<InvoiceListItem>
        aria-label="Invoices"
        rows={data}
        columns={columns}
        getRowId={(row) => row.uuid}
        loading={isLoading}
        error={isError ? error : undefined}
        onRetry={refetch}
        initialState={{ sorting: { sortModel: [{ field: 'invoice_date', sort: 'desc' }] } }}
        empty={{
          title: 'No invoices yet',
          description: 'When ATS bills your facility, invoices will show up here.',
        }}
      />
    </Box>
  );
}
