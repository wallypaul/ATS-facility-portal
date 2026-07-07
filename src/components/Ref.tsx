import { useState, type MouseEvent } from 'react';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { Link as RouterLink } from 'react-router-dom';
import { MONO } from '../theme';
import { useToast } from './ToastProvider';

// Mono, tabular reference (booking ref, invoice number). Copy-on-click; when a
// `to` is given it renders as a router link with a hover copy button beside it.
export function Ref({
  value,
  to,
  label = 'reference',
}: {
  value: string;
  to?: string;
  label?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async (e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${value}`);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const monoSx = {
    fontFamily: MONO,
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 600,
    letterSpacing: '0.01em',
  } as const;

  if (to) {
    return (
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
        <Link component={RouterLink} to={to} sx={monoSx} title={`Open ${value}`}>
          {value}
        </Link>
        <Tooltip title={copied ? 'Copied' : `Copy ${label}`}>
          <IconButton
            size="small"
            aria-label={`Copy ${label} ${value}`}
            onClick={copy}
            sx={{ opacity: 0.55, '&:hover': { opacity: 1 } }}
          >
            {copied ? <CheckIcon sx={{ fontSize: 15 }} /> : <ContentCopyIcon sx={{ fontSize: 15 }} />}
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Tooltip title={copied ? 'Copied' : `Copy ${label}`}>
      <Box
        component="button"
        type="button"
        onClick={copy}
        sx={{
          ...monoSx,
          appearance: 'none',
          border: 'none',
          background: 'none',
          p: 0,
          cursor: 'pointer',
          color: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          '&:hover': { color: 'primary.main' },
        }}
        aria-label={`Copy ${label} ${value}`}
      >
        {value}
        {copied ? (
          <CheckIcon sx={{ fontSize: 14 }} />
        ) : (
          <ContentCopyIcon sx={{ fontSize: 14, opacity: 0.5 }} />
        )}
      </Box>
    </Tooltip>
  );
}
