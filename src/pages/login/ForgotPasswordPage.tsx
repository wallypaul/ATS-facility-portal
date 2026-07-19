import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Tooltip from '@mui/material/Tooltip';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FormTextField } from '../../components/form/FormTextField';
import { confirmPasswordReset, requestPasswordReset } from '../../api/auth';
import { useColorMode } from '../../theme/ColorModeContext';
import { parseApiError } from '../../utils/errors';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});
type EmailValues = z.infer<typeof emailSchema>;

const resetSchema = z
  .object({
    code: z.string().min(1, 'Enter the code we emailed you'),
    new_password: z.string().min(10, 'New password must be at least 10 characters'),
    confirm_password: z.string().min(1, 'Confirm your new password'),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  });
type ResetValues = z.infer<typeof resetSchema>;

// Logged-out password reset: step 1 emails a 6-digit code (never reveals
// whether the email has an account), step 2 submits code + new password.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { mode, toggle } = useColorMode();
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', new_password: '', confirm_password: '' },
  });

  const submitEmail = emailForm.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { detail } = await requestPasswordReset(values.email);
      setEmail(values.email);
      setInfoMessage(detail);
      setStep('code');
    } catch (err) {
      setFormError(parseApiError(err).detail ?? 'Could not send the reset code. Please try again.');
    }
  });

  const submitReset = resetForm.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await confirmPasswordReset(email, values.code, values.new_password);
      setStep('done');
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fields.code) resetForm.setError('code', { message: parsed.fields.code });
      if (parsed.fields.new_password) {
        resetForm.setError('new_password', { message: parsed.fields.new_password });
      }
      if (!parsed.fields.code && !parsed.fields.new_password) {
        setFormError(parsed.detail ?? 'Could not reset your password. Please try again.');
      }
    }
  });

  const resendCode = async () => {
    setFormError(null);
    try {
      const { detail } = await requestPasswordReset(email);
      setInfoMessage(detail);
    } catch (err) {
      setFormError(parseApiError(err).detail ?? 'Could not resend the code. Please try again.');
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton onClick={toggle} aria-label="Toggle color mode">
            {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={0.5} sx={{ mb: 3, alignItems: 'flex-start' }}>
          <Typography variant="h2" sx={{ fontSize: '1.3rem' }}>
            {step === 'done' ? 'Password reset' : 'Reset your password'}
          </Typography>
          {step === 'email' && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Enter your account email and we'll send you a reset code.
            </Typography>
          )}
          {step === 'code' && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {infoMessage ?? `Enter the code we sent to ${email}.`}
            </Typography>
          )}
          {step === 'done' && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your password has been reset. You can now sign in.
            </Typography>
          )}
        </Stack>

        {formError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formError}
          </Alert>
        )}

        {step === 'email' && (
          <Box component="form" onSubmit={submitEmail} noValidate>
            <Stack spacing={0.5}>
              <FormTextField
                control={emailForm.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="username"
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={emailForm.formState.isSubmitting}
                sx={{ mt: 1 }}
              >
                {emailForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
              </Button>
            </Stack>
          </Box>
        )}

        {step === 'code' && (
          <Box component="form" onSubmit={submitReset} noValidate>
            <Stack spacing={0.5}>
              <FormTextField
                control={resetForm.control}
                name="code"
                label="Reset code"
                autoComplete="one-time-code"
                autoFocus
              />
              <FormTextField
                control={resetForm.control}
                name="new_password"
                label="New password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                helperText="At least 10 characters."
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowPassword((s) => !s)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <FormTextField
                control={resetForm.control}
                name="confirm_password"
                label="Confirm new password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={resetForm.formState.isSubmitting}
                sx={{ mt: 1 }}
              >
                {resetForm.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
              </Button>
              <Link
                component="button"
                type="button"
                onClick={resendCode}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              >
                Resend code
              </Link>
            </Stack>
          </Box>
        )}

        {step === 'done' && (
          <Button variant="contained" size="large" fullWidth onClick={() => navigate('/login')}>
            Back to sign in
          </Button>
        )}

        {step !== 'done' && (
          <Link
            component={RouterLink}
            to="/login"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 2 }}
          >
            <ArrowBackIcon fontSize="small" /> Back to sign in
          </Link>
        )}
      </Card>
    </Box>
  );
}
