import { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { FormTextField } from './form/FormTextField';
import { FormSelect } from './form/FormSelect';
import { FormDatePicker } from './form/FormDatePicker';
import { FormTimePicker } from './form/FormTimePicker';
import { Money } from './Money';
import { useToast } from './ToastProvider';
import { useAddTrip, useEditTrip } from '../query/hooks';
import { applyServerFieldErrors } from '../utils/form';
import { API_DATE, API_TIME, optionalDate, timeSchema, tripDateSchema } from '../utils/validation';
import { formatDate, formatDistance } from '../utils/format';
import type { ServiceLevel, Trip } from '../api/types';

const schema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  date: optionalDate,
  time: timeSchema,
  service_level: z.string().optional(),
});

type TripFormValues = z.infer<typeof schema>;

const FIELDS = ['pick_up_address', 'drop_off_address', 'date', 'time', 'service_level'] as const;

interface TripDialogProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  bookingRef: string;
  trip?: Trip; // required for edit
  services?: ServiceLevel[]; // for add-mode service_level select
  bookingDate?: string | null; // add-mode: the booking's existing trip date, if it has any trips
}

// A payer edits logistics only (pickup/drop-off/date/time); price/distance/
// duration are server-set and shown read-only. Edit pre-fills from the trip's
// planned fields, which the payer read now returns.
export function TripDialog({ open, onClose, mode, bookingRef, trip, services = [], bookingDate = null }: TripDialogProps) {
  const toast = useToast();
  const editTrip = useEditTrip();
  const addTrip = useAddTrip(bookingRef);
  const [formError, setFormError] = useState<string[]>([]);

  // A booking's date is fixed once it has any trips; only a booking with zero
  // trips (everything on it was cancelled) still needs a date picker here.
  const needsDatePicker = mode === 'add' && !bookingDate;
  const lockedDate = mode === 'edit' ? trip?.date ?? null : bookingDate;

  const defaults = useMemo<TripFormValues>(
    () => ({
      pick_up_address: trip?.pick_up_address ?? '',
      drop_off_address: trip?.drop_off_address ?? '',
      date: null,
      time: (trip?.time ? dayjs(`2000-01-01T${trip.time}`) : null) as never,
      service_level: services[0]?.code ?? '',
    }),
    [trip, services],
  );

  const { control, handleSubmit, reset, setError } = useForm<TripFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  // Reset to the current trip/defaults each time the dialog opens.
  useEffect(() => {
    if (open) {
      reset(defaults);
      setFormError([]);
    }
  }, [open, defaults, reset]);

  const busy = editTrip.isPending || addTrip.isPending;

  const onSubmit = handleSubmit(async (values) => {
    setFormError([]);
    const logistics = {
      pick_up_address: values.pick_up_address.trim(),
      drop_off_address: values.drop_off_address.trim(),
      time: dayjs(values.time).format(API_TIME),
    };
    try {
      if (mode === 'edit' && trip) {
        await editTrip.mutateAsync({ uuid: trip.uuid, input: logistics });
        toast.success('Trip updated');
      } else {
        let date = bookingDate ?? '';
        if (needsDatePicker) {
          const result = tripDateSchema.safeParse(values.date);
          if (!result.success) {
            setError('date', { type: 'validate', message: result.error.issues[0]?.message ?? 'Date is required' });
            return;
          }
          date = dayjs(values.date).format(API_DATE);
        }
        await addTrip.mutateAsync({
          ...logistics,
          date,
          service_level: values.service_level || undefined,
        });
        toast.success('Trip added');
      }
      onClose();
    } catch (err) {
      const { detail, unmapped } = applyServerFieldErrors(err, setError, FIELDS);
      const msgs = [detail, ...unmapped].filter(Boolean) as string[];
      setFormError(msgs.length ? msgs : ['Could not save the trip. Please try again.']);
    }
  });

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <Box component="form" onSubmit={onSubmit} noValidate>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {mode === 'edit' ? 'Edit trip' : 'Add trip'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={0.5} sx={{ pt: 0.5 }}>
            {formError.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {formError.map((m, i) => (
                  <div key={i}>{m}</div>
                ))}
              </Alert>
            )}

            <FormTextField
              control={control}
              name="pick_up_address"
              label="Pickup address"
              autoFocus
            />
            <FormTextField control={control} name="drop_off_address" label="Drop-off address" />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              {needsDatePicker ? (
                <FormDatePicker control={control} name="date" label="Date" disablePast />
              ) : (
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Date
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {formatDate(lockedDate)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Set by the booking's date — not editable here
                  </Typography>
                </Box>
              )}
              <FormTimePicker control={control} name="time" label="Time" />
            </Stack>

            {mode === 'add' && services.length > 0 && (
              <FormSelect
                control={control}
                name="service_level"
                label="Service level"
                options={services.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }))}
                helperText="The server prices this trip from your rate schedule."
              />
            )}

            {mode === 'edit' && trip && (
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Set by your rate schedule — not editable here
                </Typography>
                <Stack direction="row" spacing={3} sx={{ mt: 0.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Price
                    </Typography>
                    <Money value={trip.price} emphasis />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Distance
                    </Typography>
                    <Typography variant="body2">{formatDistance(trip.distance)}</Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={onClose} color="inherit" disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add trip'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
