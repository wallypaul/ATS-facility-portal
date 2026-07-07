import { useState } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';

import { PageHeader } from '../../components/PageHeader';
import { FormTextField } from '../../components/form/FormTextField';
import { useToast } from '../../components/ToastProvider';
import { useChangePassword } from '../../query/hooks';
import { errorMessage } from '../../utils/errors';

const schema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    new_password: z.string().min(10, 'New password must be at least 10 characters'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });

type Values = z.infer<typeof schema>;

export function SettingsPage() {
  const toast = useToast();
  const changePassword = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);

  const { control, handleSubmit, reset, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword.mutateAsync({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      toast.success('Password changed');
      reset();
    } catch (err) {
      // Django returns each field's errors as a LIST of messages — surface all of
      // them under the matching field (password validators return several at once).
      const data = err instanceof AxiosError ? err.response?.data : undefined;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const record = data as Record<string, unknown>;
        (['current_password', 'new_password'] as const).forEach((field) => {
          const v = record[field];
          if (v) setError(field, { message: Array.isArray(v) ? v.join(' ') : String(v) });
        });
        const detail = record.detail ?? (record.non_field_errors as string[] | undefined)?.[0];
        if (detail) setFormError(String(detail));
      } else {
        setFormError(errorMessage(err, 'Could not change your password.'));
      }
    }
  });

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Manage your account." />
      <Card sx={{ p: { xs: 2, sm: 3 }, maxWidth: 480 }}>
        <Typography variant="h3" sx={{ mb: 0.5 }}>
          Change password
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Choose a new password of at least 10 characters.
        </Typography>

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Stack spacing={0.5}>
            {formError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {formError}
              </Alert>
            )}
            <FormTextField
              control={control}
              name="current_password"
              label="Current password"
              type="password"
              autoComplete="current-password"
            />
            <FormTextField
              control={control}
              name="new_password"
              label="New password"
              type="password"
              autoComplete="new-password"
              helperText="At least 10 characters."
            />
            <FormTextField
              control={control}
              name="confirm_password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={changePassword.isPending}
              sx={{ mt: 1, alignSelf: 'flex-start' }}
            >
              {changePassword.isPending ? 'Saving…' : 'Change password'}
            </Button>
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
