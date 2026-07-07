import { useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import Chip from '@mui/material/Chip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';

import { PageHeader } from '../../components/PageHeader';
import { StatusChip } from '../../components/StatusChip';
import { Ref } from '../../components/Ref';
import { Money } from '../../components/Money';
import { ErrorState, EmptyState } from '../../components/StateViews';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TripDialog } from '../../components/TripDialog';
import { useToast } from '../../components/ToastProvider';
import { useBooking, useCancelTrip, useServices } from '../../query/hooks';
import { parseApiError } from '../../utils/errors';
import { formatDate, formatDistance, formatTime } from '../../utils/format';
import type { Passenger, Trip } from '../../api/types';

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

function PassengerSummary({ p }: { p: Passenger }) {
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Patient" value={`${p.firstName} ${p.lastName}`} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Date of birth" value={formatDate(p.dob)} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Phone" value={p.phone_1} />
      </Grid>
      <Grid size={{ xs: 6, sm: 3 }}>
        <Field label="Email" value={p.email} />
      </Grid>
    </Grid>
  );
}

function TripRow({
  trip,
  onEdit,
  onCancel,
}: {
  trip: Trip;
  onEdit: () => void;
  onCancel: () => void;
}) {
  return (
    <Box sx={{ py: 2 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', color: 'text.primary' }}
          >
            <Typography sx={{ fontWeight: 600 }}>{trip.pick_up_address}</Typography>
            <ArrowRightAltIcon sx={{ color: 'text.secondary' }} fontSize="small" />
            <Typography sx={{ fontWeight: 600 }}>{trip.drop_off_address}</Typography>
          </Stack>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', gap: 1.5, mt: 0.5, color: 'text.secondary', flexWrap: 'wrap' }}
          >
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
              <EventOutlinedIcon sx={{ fontSize: 15 }} />
              <Typography variant="body2">
                {formatDate(trip.date)} · {formatTime(trip.time)}
              </Typography>
            </Box>
            <Chip size="small" variant="outlined" label={formatDistance(trip.distance)} />
          </Stack>
        </Box>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
          <Money value={trip.price} emphasis sx={{ fontSize: '1.05rem' }} />
          <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
            Edit
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<DeleteOutlineIcon />}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export function BookingDetailPage() {
  const { ref = '' } = useParams();
  const toast = useToast();
  const { data, isLoading, isError, error, refetch } = useBooking(ref);
  const servicesQuery = useServices();
  const cancelTrip = useCancelTrip();

  const [editing, setEditing] = useState<Trip | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Trip | null>(null);

  const back = (
    <Link component={RouterLink} to="/bookings" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <ArrowBackIcon fontSize="small" /> Bookings
    </Link>
  );

  if (isLoading) {
    return (
      <Box>
        {back}
        <Skeleton variant="text" width={220} height={40} />
        <Skeleton variant="rounded" height={140} sx={{ my: 2 }} />
        <Skeleton variant="rounded" height={220} />
      </Box>
    );
  }

  if (isError) {
    const status = parseApiError(error).status;
    return (
      <Box>
        {back}
        {status === 404 ? (
          <Card>
            <EmptyState
              title="Booking not found"
              description="This booking doesn't exist or isn't one of your facility's records."
              action={
                <Button component={RouterLink} to="/bookings" variant="outlined">
                  Back to bookings
                </Button>
              }
            />
          </Card>
        ) : (
          <Card>
            <ErrorState error={error} onRetry={() => refetch()} />
          </Card>
        )}
      </Box>
    );
  }

  if (!data) return null;

  const doCancel = () => {
    if (!confirmCancel) return;
    const uuid = confirmCancel.uuid;
    cancelTrip.mutate(
      { uuid },
      {
        onSuccess: () => toast.success('Trip cancelled'),
        onError: (err) => toast.error(parseApiError(err).detail ?? 'Could not cancel the trip.'),
        onSettled: () => setConfirmCancel(null),
      },
    );
  };

  return (
    <Box sx={{ pb: 4 }}>
      {back}
      <PageHeader
        title={<Ref value={data.ref} label="booking ref" />}
        subtitle={`${data.passenger.firstName} ${data.passenger.lastName}`}
        action={
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
            <StatusChip status={data.status} />
            <StatusChip status={data.payment_status} />
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <PassengerSummary p={data.passenger} />
        {data.payer && (
          <>
            <Divider sx={{ my: 2 }} />
            <Field label="Payer" value={data.payer} />
          </>
        )}
      </Card>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
        >
          <Typography variant="h3">Trips ({data.trips.length})</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
            Add trip
          </Button>
        </Stack>

        {data.trips.length === 0 ? (
          <EmptyState
            title="No trips on this booking"
            description="Add a trip to schedule transportation for this patient."
            action={
              <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                Add trip
              </Button>
            }
          />
        ) : (
          <Stack divider={<Divider />}>
            {data.trips.map((trip) => (
              <TripRow
                key={trip.uuid}
                trip={trip}
                onEdit={() => setEditing(trip)}
                onCancel={() => setConfirmCancel(trip)}
              />
            ))}
          </Stack>
        )}
      </Card>

      {/* Edit trip */}
      {editing && (
        <TripDialog
          open={Boolean(editing)}
          onClose={() => setEditing(null)}
          mode="edit"
          bookingRef={data.ref}
          trip={editing}
        />
      )}

      {/* Add trip */}
      <TripDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
        bookingRef={data.ref}
        services={servicesQuery.data?.services ?? []}
      />

      {/* Cancel confirm */}
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
