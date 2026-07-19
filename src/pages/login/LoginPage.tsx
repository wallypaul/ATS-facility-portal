import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
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
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { FormTextField } from '../../components/form/FormTextField';
import { useAuth } from '../../auth/AuthContext';
import { useColorMode } from '../../theme/ColorModeContext';
import { parseApiError } from '../../utils/errors';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const { login, isAuthenticated, isPayer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useColorMode();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as { from?: Location } | null)?.from?.pathname ?? '/';

  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  // Already signed in as a payer? Skip the form.
  if (isAuthenticated && isPayer) {
    return <Navigate to={from === '/login' ? '/' : from} replace />;
  }

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const user = await login(email, password);
      if (user.user_type !== 'payer') {
        setFormError('This portal is for payer/facility accounts.');
        return;
      }
      navigate(from === '/login' ? '/' : from, { replace: true });
    } catch (err) {
      const parsed = parseApiError(err);
      // Auth failures are 400/401 — collapse to one honest message, never a stack trace.
      if (parsed.status === 400 || parsed.status === 401) {
        setFormError('Invalid email or password.');
      } else {
        setFormError(parsed.detail ?? 'Could not sign in. Please try again.');
      }
    }
  });

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        // Transparent so the theme's ambient backdrop shows and the card reads as glass.
        p: 2,
        position: 'relative',
      }}
    >
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
          <IconButton onClick={toggle} aria-label="Toggle color mode">
            {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      <Card sx={{ width: '100%', maxWidth: 400, p: { xs: 3, sm: 4 } }}>
        <Stack spacing={0.5} sx={{ mb: 3, alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              A
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1.05rem' }}>ATS Facility Portal</Typography>
          </Box>
          <Typography variant="h2" sx={{ fontSize: '1.3rem' }}>
            Sign in
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Book and manage patient transportation for your facility.
          </Typography>
        </Stack>

        <Box component="form" onSubmit={onSubmit} noValidate>
          <Stack spacing={0.5}>
            {formError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {formError}
              </Alert>
            )}
            <FormTextField
              control={control}
              name="email"
              label="Email"
              type="email"
              autoComplete="username"
              autoFocus
            />
            <FormTextField
              control={control}
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              sx={{ alignSelf: 'flex-end', mt: -0.5 }}
            >
              Forgot password?
            </Link>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={formState.isSubmitting}
              sx={{ mt: 1 }}
            >
              {formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
