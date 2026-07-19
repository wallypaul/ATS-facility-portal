import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useForm, useFieldArray, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';

import { PageHeader } from '../../components/PageHeader';
import { FormTextField } from '../../components/form/FormTextField';
import { FormAddressField } from '../../components/form/FormAddressField';
import { FormSelect } from '../../components/form/FormSelect';
import { FormSwitch } from '../../components/form/FormSwitch';
import { FormDatePicker } from '../../components/form/FormDatePicker';
import { FormTimePicker } from '../../components/form/FormTimePicker';
import { Money } from '../../components/Money';
import { ErrorState } from '../../components/StateViews';
import { useToast } from '../../components/ToastProvider';
import { useServices, useBook, useQuote } from '../../query/hooks';
import { applyServerFieldErrors } from '../../utils/form';
import { API_DATE, API_TIME, dobSchema, timeSchema, tripDateSchema } from '../../utils/validation';
import { formatDistance } from '../../utils/format';
import { glassSx } from '../../theme';
import type { Quote, ServiceLevel } from '../../api/types';

const legSchema = z.object({
  pick_up_address: z.string().trim().min(1, 'Pickup address is required'),
  drop_off_address: z.string().trim().min(1, 'Drop-off address is required'),
  date: tripDateSchema,
  time: timeSchema,
  service_level: z.string().min(1, 'Service level is required'),
});

const schema = z.object({
  passenger: z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Enter a valid email'),
    phone_1: z.string().trim().min(1, 'Phone number is required'),
    dob: dobSchema,
  }),
  passengers: z.coerce.number().int().min(1, 'At least 1').max(20, 'Too many'),
  toll: z.boolean().default(false),
  weight: z.coerce.number().min(0).optional(),
  tripsData: z.array(legSchema).min(1, 'Add at least one leg'),
});

type BookValues = z.infer<typeof schema>;

const emptyLeg = (serviceLevel: string) => ({
  pick_up_address: '',
  drop_off_address: '',
  date: null as never,
  time: null as never,
  service_level: serviceLevel,
});

export function BookPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const servicesQuery = useServices();
  const book = useBook();
  const quote = useQuote();

  const services: ServiceLevel[] = servicesQuery.data?.services ?? [];

  // Quote results keyed by field-array id (stable across reorders/removals).
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string[]>([]);

  const { control, handleSubmit, getValues, setValue, setError } = useForm<BookValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      passenger: { firstName: '', lastName: '', email: '', phone_1: '', dob: null as never },
      passengers: 1,
      toll: false,
      weight: undefined,
      tripsData: [emptyLeg('')],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'tripsData' });

  // Default the first leg's service level once the picker options arrive.
  useEffect(() => {
    if (services.length && !getValues('tripsData.0.service_level')) {
      setValue('tripsData.0.service_level', services[0].code);
    }
  }, [services, getValues, setValue]);

  const handleQuote = async (fieldId: string, index: number) => {
    const leg = getValues(`tripsData.${index}`);
    if (!leg.pick_up_address || !leg.drop_off_address || !leg.service_level) {
      toast.error('Enter pickup, drop-off and service level first.');
      return;
    }
    setQuotingId(fieldId);
    try {
      const result = await quote.mutateAsync({
        service_level: leg.service_level,
        origin: leg.pick_up_address,
        destination: leg.drop_off_address,
        toll: getValues('toll'),
        weight: getValues('weight'),
      });
      setQuotes((q) => ({ ...q, [fieldId]: result }));
    } catch (err) {
      const { detail, unmapped } = applyServerFieldErrors(err, setError, []);
      toast.error(detail ?? unmapped[0] ?? 'Could not get a quote for this leg.');
    } finally {
      setQuotingId(null);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError([]);
    const payload = {
      passenger: {
        firstName: values.passenger.firstName.trim(),
        lastName: values.passenger.lastName.trim(),
        email: values.passenger.email.trim(),
        phone_1: values.passenger.phone_1.trim(),
        dob: dayjs(values.passenger.dob).format(API_DATE),
      },
      serviceData: {
        // ponytail: `service` is the ride-type id (separate from rate `service_level`);
        // the portal flow uses "2" (Ambulatory) as in the documented request.
        service: '2',
        passengers: values.passengers,
        toll: values.toll,
        weight: values.weight,
      },
      tripsData: values.tripsData.map((l) => ({
        pick_up_address: l.pick_up_address.trim(),
        drop_off_address: l.drop_off_address.trim(),
        date: dayjs(l.date).format(API_DATE),
        time: dayjs(l.time).format(API_TIME),
        service_level: l.service_level,
      })),
    };

    try {
      const created = await book.mutateAsync(payload);
      toast.success(`Booking ${created.ref} created`);
      navigate(`/bookings/${encodeURIComponent(created.ref)}`);
    } catch (err) {
      const valid = [
        'passenger.firstName',
        'passenger.lastName',
        'passenger.email',
        'passenger.phone_1',
        'passenger.dob',
        'passengers',
        ...values.tripsData.flatMap((_, i) => [
          `tripsData.${i}.pick_up_address`,
          `tripsData.${i}.drop_off_address`,
          `tripsData.${i}.date`,
          `tripsData.${i}.time`,
          `tripsData.${i}.service_level`,
        ]),
      ];
      const { detail, unmapped } = applyServerFieldErrors(err, setError, valid);
      const msgs = [detail, ...unmapped].filter(Boolean) as string[];
      setFormError(msgs.length ? msgs : ['Could not create the booking. Check the fields and try again.']);
    }
  });

  if (servicesQuery.isLoading) {
    return (
      <Box>
        <PageHeader title="Book a trip" subtitle="Enter the patient and route details, then confirm." />
        <Skeleton variant="rounded" height={260} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={320} />
      </Box>
    );
  }

  if (servicesQuery.isError) {
    return (
      <Box>
        <PageHeader title="Book a trip" />
        <Card sx={{ p: 0 }}>
          <ErrorState error={servicesQuery.error} onRetry={() => servicesQuery.refetch()} />
        </Card>
      </Box>
    );
  }

  const quotedTotal = fields.reduce((sum, f) => sum + Number(quotes[f.id]?.price ?? 0), 0);
  const quotedCount = fields.filter((f) => quotes[f.id]).length;

  return (
    <Box component="form" onSubmit={onSubmit} noValidate sx={{ pb: 10 }}>
      <PageHeader
        title="Book a trip"
        subtitle="One patient per booking. Add extra legs (e.g. a return) before booking."
      />

      {services.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your payer has no active service levels configured. Contact ATS to set up your rate
          schedule before booking.
        </Alert>
      )}

      {formError.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError([])}>
          {formError.map((m, i) => (
            <div key={i}>{m}</div>
          ))}
        </Alert>
      )}

      {/* Passenger */}
      <Card sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Patient
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField control={control} name="passenger.firstName" label="First name" autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField control={control} name="passenger.lastName" label="Last name" autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField control={control} name="passenger.email" label="Email" type="email" autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField control={control} name="passenger.phone_1" label="Phone" autoComplete="off" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormDatePicker control={control} name="passenger.dob" label="Date of birth" disableFuture />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField
              control={control}
              name="passengers"
              label="Passengers"
              type="number"
              slotProps={{ htmlInput: { min: 1, max: 20 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormTextField
              control={control}
              name="weight"
              label="Weight"
              type="number"
              slotProps={{ htmlInput: { min: 0 } }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormSwitch control={control} name="toll" label="Include toll" />
          </Grid>
        </Grid>
      </Card>

      {/* Legs */}
      <Stack spacing={2}>
        {fields.map((field, index) => (
          <LegCard
            key={field.id}
            control={control}
            index={index}
            services={services}
            quote={quotes[field.id]}
            quoting={quotingId === field.id}
            onQuote={() => handleQuote(field.id, index)}
            onRemove={fields.length > 1 ? () => remove(index) : undefined}
          />
        ))}
      </Stack>

      <Button
        type="button"
        startIcon={<AddIcon />}
        onClick={() => append(emptyLeg(services[0]?.code ?? ''))}
        sx={{ mt: 2 }}
        variant="outlined"
      >
        Add another leg
      </Button>

      {/* Sticky confirm bar — frosted to match the glass surfaces */}
      <Box
        sx={(t) => ({
          position: 'sticky',
          bottom: 0,
          mt: 3,
          mx: { xs: -2, sm: -3 },
          px: { xs: 2, sm: 3 },
          py: 2,
          ...glassSx(t.palette.mode),
          border: 'none',
          borderTop: t.palette.mode === 'light' ? '1px solid rgba(18,32,30,0.07)' : '1px solid rgba(255,255,255,0.07)',
          borderRadius: 0,
          boxShadow: 'none',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 2,
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: t.zIndex.appBar - 1,
        })}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            Estimated total {quotedCount > 0 ? `(${quotedCount} of ${fields.length} legs quoted)` : ''}
          </Typography>
          <Money value={quotedTotal || null} emphasis sx={{ fontSize: '1.4rem' }} />
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={book.isPending || services.length === 0}
        >
          {book.isPending ? 'Booking…' : 'Book trip'}
        </Button>
      </Box>
    </Box>
  );
}

// --- One trip leg ---
function LegCard({
  control,
  index,
  services,
  quote,
  quoting,
  onQuote,
  onRemove,
}: {
  control: Control<BookValues>;
  index: number;
  services: ServiceLevel[];
  quote?: Quote;
  quoting: boolean;
  onQuote: () => void;
  onRemove?: () => void;
}) {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h3">Leg {index + 1}</Typography>
        {onRemove && (
          <Tooltip title="Remove leg">
            <IconButton onClick={onRemove} aria-label={`Remove leg ${index + 1}`} size="small">
              <DeleteOutlineIcon />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormAddressField control={control} name={`tripsData.${index}.pick_up_address`} label="Pickup address" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormAddressField control={control} name={`tripsData.${index}.drop_off_address`} label="Drop-off address" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormDatePicker control={control} name={`tripsData.${index}.date`} label="Date" disablePast />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormTimePicker control={control} name={`tripsData.${index}.time`} label="Time" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <FormSelect
            control={control}
            name={`tripsData.${index}.service_level`}
            label="Service level"
            options={services.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` }))}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 1.5 }} />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 1.5 }}
      >
        <Button type="button" variant="outlined" onClick={onQuote} disabled={quoting} size="small">
          {quoting ? 'Getting quote…' : quote ? 'Update quote' : 'Get quote'}
        </Button>

        {quote ? (
          <Box sx={{ textAlign: { sm: 'right' } }}>
            <Stack
              direction="row"
              sx={{ alignItems: 'center', gap: 1, justifyContent: { sm: 'flex-end' }, flexWrap: 'wrap' }}
            >
              <Chip
                size="small"
                icon={<ArrowRightAltIcon />}
                label={formatDistance(quote.distance_miles)}
                variant="outlined"
              />
              <Money value={quote.price} emphasis sx={{ fontSize: '1.15rem' }} />
            </Stack>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { sm: 'flex-end' } }}
            >
              <LockOutlinedIcon sx={{ fontSize: 13 }} /> Rate-schedule price — read-only
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Price is set by your payer's rate schedule and confirmed on booking.
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
