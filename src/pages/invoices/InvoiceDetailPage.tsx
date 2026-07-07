import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { useInvoice } from '../../query/hooks';
import { parseApiError } from '../../utils/errors';
import { formatDate } from '../../utils/format';
import { MONO } from '../../theme';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export function InvoiceDetailPage() {
  const { uuid = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useInvoice(uuid);

  const back = (
    <Link
      component={RouterLink}
      to="/invoices"
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1 }}
    >
      <ArrowBackIcon fontSize="small" /> Invoices
    </Link>
  );

  if (isLoading) {
    return (
      <Box>
        {back}
        <Skeleton variant="text" width={240} height={40} />
        <Skeleton variant="rounded" height={140} sx={{ my: 2 }} />
        <Skeleton variant="rounded" height={260} />
      </Box>
    );
  }

  if (isError) {
    const status = parseApiError(error).status;
    return (
      <Box>
        {back}
        <Card>
          {status === 404 ? (
            <EmptyState
              title="Invoice not found"
              description="This invoice doesn't exist or isn't billed to your facility."
              action={
                <Button component={RouterLink} to="/invoices" variant="outlined">
                  Back to invoices
                </Button>
              }
            />
          ) : (
            <ErrorState error={error} onRetry={() => refetch()} />
          )}
        </Card>
      </Box>
    );
  }

  if (!data) return null;

  const balance = Number(data.total_amount) - Number(data.amount_paid);

  return (
    <Box sx={{ pb: 4 }}>
      {back}
      <PageHeader
        title={<Ref value={data.invoice_number} label="invoice number" />}
        subtitle="Read-only invoice detail"
        action={<StatusChip status={data.status} />}
      />

      <Card sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Field label="Issued" value={formatDate(data.invoice_date)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Field label="Due" value={formatDate(data.due_date)} />
          </Grid>
          {data.payer && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <Field label="Payer" value={data.payer} />
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Total
            </Typography>
            <Money value={data.total_amount} emphasis sx={{ fontSize: '1.2rem' }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Paid
            </Typography>
            <Money value={data.amount_paid} sx={{ fontSize: '1.2rem' }} />
          </Grid>
          <Grid size={{ xs: 4 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Balance
            </Typography>
            <Money
              value={balance}
              emphasis
              sx={{ fontSize: '1.2rem', color: balance > 0 ? 'secondary.main' : 'success.main' }}
            />
          </Grid>
        </Grid>

        {data.notes && (
          <>
            <Divider sx={{ my: 2 }} />
            <Field label="Notes" value={data.notes} />
          </>
        )}
      </Card>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography variant="h3" sx={{ mb: 1.5 }}>
          Line items ({data.lines.length})
        </Typography>

        {data.lines.length === 0 ? (
          <EmptyState title="No line items" description="This invoice has no line items." />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="Invoice line items">
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit price</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Trip</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.lines.map((line) => (
                  <TableRow key={line.uuid} hover>
                    <TableCell sx={{ maxWidth: 320 }}>{line.description}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO, fontVariantNumeric: 'tabular-nums' }}>
                      {line.quantity}
                    </TableCell>
                    <TableCell align="right">
                      <Money value={line.unit_price} />
                    </TableCell>
                    <TableCell align="right">
                      <Money value={line.amount} emphasis />
                    </TableCell>
                    <TableCell align="right" sx={{ fontFamily: MONO, color: 'text.secondary' }}>
                      {line.trip_id ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
