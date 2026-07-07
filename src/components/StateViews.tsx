import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import BlockIcon from '@mui/icons-material/Block';
import { errorMessage } from '../utils/errors';

interface StateBlockProps {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}

// One consistent centered block for empty / error / not-authorized states.
function StateBlock({ icon, title, description, action, tone = 'neutral' }: StateBlockProps) {
  return (
    <Stack
      spacing={1.5}
      sx={{
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
        py: 6,
        color: 'text.secondary',
        minHeight: 220,
      }}
    >
      <Box
        aria-hidden
        sx={{
          display: 'grid',
          placeItems: 'center',
          width: 52,
          height: 52,
          borderRadius: '50%',
          bgcolor: tone === 'error' ? 'error.main' : 'action.hover',
          color: tone === 'error' ? 'error.contrastText' : 'text.secondary',
          '& svg': { fontSize: 28 },
        }}
      >
        {icon}
      </Box>
      <Typography variant="h4" sx={{ color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Stack>
  );
}

export function CenteredSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 220, gap: 2 }}>
      <CircularProgress size={28} thickness={4} aria-label={label} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
    </Stack>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <StateBlock
      icon={icon ?? <InboxOutlinedIcon />}
      title={title}
      description={description}
      action={action}
    />
  );
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <StateBlock
      tone="error"
      icon={<ErrorOutlineIcon />}
      title={title}
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Button variant="outlined" color="inherit" onClick={onRetry}>
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

export function NotAuthorized() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 3 }}>
      <StateBlock
        tone="error"
        icon={<BlockIcon />}
        title="Not authorized"
        description="This portal is for payer/facility accounts. Sign in with a payer account to continue."
      />
    </Box>
  );
}
