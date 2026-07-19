import { Fragment, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
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
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { useBooking, useInvoice } from '../../query/hooks';
import { downloadInvoice } from '../../api/payer';
import type { InvoiceBiller } from '../../api/types';
import { parseApiError } from '../../utils/errors';
import { formatDate, formatTime } from '../../utils/format';
import { MONO } from '../../theme';
import { PayPanel } from './PayPanel';

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

// "Billed by" — the biller attached to the invoice (matches the PDF header).
function BilledBy({ biller }: { biller: InvoiceBiller }) {
  const cityLine = [biller.city, biller.state].filter(Boolean).join(', ');
  const lines = [
    biller.line1,
    biller.line2,
    [cityLine, biller.postal_code].filter(Boolean).join(' '),
    biller.country,
    biller.phone,
    biller.email,
  ].filter(Boolean);
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        Billed by
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {biller.name}
      </Typography>
      {lines.map((line) => (
        <Typography key={line} variant="body2" sx={{ color: 'text.secondary' }}>
          {line}
        </Typography>
      ))}
    </Box>
  );
}

// Shown in place of the pay panel right after a successful charge. Reads the
// remaining balance live so a rare partial charge still reports honestly.
function PaidConfirmation({ charged, balance }: { charged: number; balance: number }) {
  const settled = balance <= 0;
  return (
    <Card component="section" sx={{ p: { xs: 2.5, sm: 3 } }}>
      <Stack direction="row" sx={{ gap: 2, alignItems: 'center' }}>
        <Box
          aria-hidden
          sx={{
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'success.main',
            color: 'success.contrastText',
            '& svg': { fontSize: 30 },
          }}
        >
          <CheckCircleOutlineIcon />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3">Payment received</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
            Thank you — your payment of <Money value={charged} emphasis /> was processed.
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {settled ? 'This invoice is paid in full.' : 'Remaining balance'}
        </Typography>
        <Money
          value={balance}
          emphasis
          sx={{ fontSize: '1.15rem', color: settled ? 'success.main' : 'secondary.main' }}
        />
      </Stack>
    </Card>
  );
}

// Inline summary shown under a line item when its booking ref is expanded —
// fetched lazily (only mounts on expand) via the same booking-detail query the
// Bookings pages already use, so a repeat expand is instant from cache.
function LineBookingSummary({ bookingRef }: { bookingRef: string }) {
  const { data, isLoading, isError, error } = useBooking(bookingRef);

  if (isLoading) {
    return <Skeleton variant="rounded" height={64} sx={{ m: 1.5 }} />;
  }
  if (isError) {
    return (
      <Typography variant="body2" sx={{ color: 'error.main', p: 1.5 }}>
        Could not load booking {bookingRef}: {parseApiError(error).detail ?? 'unknown error'}
      </Typography>
    );
  }
  if (!data) return null;

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" sx={{ gap: 3, flexWrap: 'wrap', alignItems: 'center', mb: data.trips.length ? 1 : 0 }}>
        <Field label="Patient" value={`${data.passenger.firstName} ${data.passenger.lastName}`} />
        <Field label="Service" value={data.serviceData.service} />
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Status
          </Typography>
          <StatusChip status={data.status} />
        </Box>
      </Stack>
      {data.trips.map((trip) => (
        <Stack
          key={trip.uuid}
          direction="row"
          sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap', color: 'text.secondary', mt: 0.5 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {trip.pick_up_address}
          </Typography>
          <ArrowRightAltIcon sx={{ fontSize: 16 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {trip.drop_off_address}
          </Typography>
          <Typography variant="body2">
            · {formatDate(trip.date)} · {formatTime(trip.time)}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}

export function InvoiceDetailPage() {
  const { uuid = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useInvoice(uuid);
  // Set to the charged amount once a payment succeeds, so the pay panel gives way
  // to a confirmation for the rest of this visit.
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [dlAnchor, setDlAnchor] = useState<HTMLElement | null>(null);
  const [dlError, setDlError] = useState(false);
  const [expandedLines, setExpandedLines] = useState<Set<string>>(new Set());
  const toggleLine = (lineUuid: string) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineUuid)) next.delete(lineUuid);
      else next.add(lineUuid);
      return next;
    });
  };

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

  const doDownload = async (fmt: 'pdf' | 'excel') => {
    setDlAnchor(null);
    setDlError(false);
    try {
      await downloadInvoice(uuid, data.invoice_number, fmt);
    } catch {
      setDlError(true);
    }
  };

  return (
    <Box sx={{ pb: 4 }}>
      {back}
      <PageHeader
        title={<Ref value={data.invoice_number} label="invoice number" />}
        subtitle={data.payer ? `Billed to ${data.payer}` : 'Invoice detail'}
        action={
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <StatusChip status={data.status} />
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileDownloadOutlinedIcon />}
              onClick={(e) => setDlAnchor(e.currentTarget)}
            >
              Download
            </Button>
            <Menu anchorEl={dlAnchor} open={!!dlAnchor} onClose={() => setDlAnchor(null)}>
              <MenuItem onClick={() => doDownload('pdf')}>PDF</MenuItem>
              <MenuItem onClick={() => doDownload('excel')}>Excel</MenuItem>
            </Menu>
          </Stack>
        }
      />

      {dlError && (
        <Alert severity="error" onClose={() => setDlError(false)} sx={{ mb: 2 }}>
          Could not download the invoice. Please try again.
        </Alert>
      )}

      <Card sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        {data.biller && (
          <>
            <BilledBy biller={data.biller} />
            <Divider sx={{ my: 2 }} />
          </>
        )}
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Field label="Issued" value={formatDate(data.invoice_date)} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Field label="Due" value={data.due_date ? formatDate(data.due_date) : 'On receipt'} />
          </Grid>
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

      {/* Online pay — only for a SENT invoice with an outstanding balance and a
          Square config. After a successful charge, the confirmation takes over. */}
      {data.square && (paidAmount !== null || (data.status === 'SENT' && balance > 0)) && (
        <Box sx={{ mb: 2 }}>
          {paidAmount !== null ? (
            <PaidConfirmation charged={paidAmount} balance={balance} />
          ) : (
            <PayPanel invoice={data} amount={balance} onPaid={setPaidAmount} />
          )}
        </Box>
      )}

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
                  <TableCell align="right">Booking</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.lines.map((line) => {
                  const expanded = expandedLines.has(line.uuid);
                  return (
                    <Fragment key={line.uuid}>
                      <TableRow hover>
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
                        <TableCell align="right" sx={{ fontFamily: MONO }}>
                          {line.booking_ref ? (
                            <Link
                              component="button"
                              type="button"
                              onClick={() => toggleLine(line.uuid)}
                              sx={{ fontFamily: MONO, fontWeight: 600 }}
                            >
                              {line.booking_ref}
                            </Link>
                          ) : (
                            <Box component="span" sx={{ color: 'text.secondary' }}>{line.trip_id ?? '—'}</Box>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && line.booking_ref && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0, bgcolor: 'action.hover' }}>
                            <LineBookingSummary bookingRef={line.booking_ref} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </Box>
  );
}
