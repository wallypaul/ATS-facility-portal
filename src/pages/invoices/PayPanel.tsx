import { useState } from 'react';
import { AxiosError } from 'axios';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import CircularProgress from '@mui/material/CircularProgress';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';

import { Money } from '../../components/Money';
import { useToast } from '../../components/ToastProvider';
import { usePayInvoice } from '../../query/hooks';
import { errorMessage } from '../../utils/errors';
import { formatMoney } from '../../utils/format';
import { useSquareCard } from './useSquareCard';
import type { InvoiceDetail } from '../../api/types';

// The pay endpoint returns its failure as `{ error: "…" }` (400 not payable /
// 402 card declined) — a different shape from the rest of the API's `{ detail }`
// / field errors. Prefer that string; fall back to the generic parser.
function payErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { error?: string } | undefined;
    if (typeof data?.error === 'string' && data.error) return data.error;
  }
  return errorMessage(err, 'The payment could not be completed. Please try again.');
}

// Online-pay panel for a SENT invoice with an outstanding balance and a Square
// config. Renders the Square card field, tokenizes in-browser, then charges the
// server-computed balance. `amount` is the client-computed balance, shown for
// confirmation only — the server is the source of truth for what's charged.
export function PayPanel({
  invoice,
  amount,
  onPaid,
}: {
  invoice: InvoiceDetail;
  amount: number;
  onPaid: (charged: number) => void;
}) {
  const { containerRef, status, loadError, tokenize } = useSquareCard(invoice.square);
  const pay = usePayInvoice(invoice.uuid);
  const toast = useToast();
  const [payError, setPayError] = useState<string>();
  const [tokenizing, setTokenizing] = useState(false);

  const busy = tokenizing || pay.isPending;

  async function handlePay() {
    if (busy || status !== 'ready') return;
    setPayError(undefined);
    setTokenizing(true);
    let sourceId: string;
    try {
      sourceId = await tokenize();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : 'Please check your card details and try again.');
      return;
    } finally {
      setTokenizing(false);
    }
    pay.mutate(sourceId, {
      onSuccess: () => {
        toast.success('Payment received — thank you.');
        onPaid(amount);
      },
      onError: (err) => setPayError(payErrorMessage(err)),
    });
  }

  return (
    <Card component="section" aria-labelledby="pay-heading" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
      >
        <Box>
          <Typography id="pay-heading" variant="h3" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CreditCardOutlinedIcon fontSize="small" sx={{ color: 'primary.main' }} />
            Pay this invoice
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Settle the outstanding balance with a credit or debit card.
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Amount due
          </Typography>
          <Money value={amount} emphasis sx={{ fontSize: '1.5rem', color: 'secondary.main' }} />
        </Box>
      </Stack>

      <Divider sx={{ my: 2.5 }} />

      {status === 'error' ? (
        <Alert severity="error" variant="outlined">
          {loadError ?? "The secure payment form couldn't be loaded. Please refresh and try again."}
        </Alert>
      ) : (
        <>
          <Typography
            component="label"
            variant="caption"
            sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}
          >
            Card details
          </Typography>

          {/* Square renders its own iframe field inside this box. A white well
              keeps the card input on a familiar, high-contrast surface in both
              themes. The skeleton sits on top until the field is interactive. */}
          <Box sx={{ position: 'relative' }}>
            <Box
              ref={containerRef}
              sx={{
                minHeight: 52,
                px: 1.5,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: '#fff',
                boxShadow: 'inset 0 1px 2px rgba(18,32,30,0.06)',
                transition: 'border-color 150ms',
                '& > *': { width: '100%' },
              }}
            />
            {status === 'loading' && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  px: 1.5,
                  bgcolor: 'background.paper',
                }}
              >
                <Skeleton variant="text" width="60%" height={28} />
              </Box>
            )}
          </Box>

          {payError && (
            <Alert severity="error" variant="outlined" sx={{ mt: 2 }}>
              {payError}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={status !== 'ready' || busy}
            onClick={handlePay}
            startIcon={
              busy ? (
                <CircularProgress size={18} thickness={5} color="inherit" />
              ) : (
                <LockOutlinedIcon />
              )
            }
            sx={{ mt: 2.5 }}
          >
            {busy ? 'Processing…' : `Pay ${formatMoney(amount)}`}
          </Button>

          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 1.5, color: 'text.secondary' }}
          >
            <LockOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography variant="caption">
              Encrypted and processed by Square. Your card number never touches our servers.
            </Typography>
          </Stack>
        </>
      )}
    </Card>
  );
}
