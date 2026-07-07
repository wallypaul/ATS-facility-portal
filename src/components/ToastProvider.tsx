import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert, { type AlertColor } from '@mui/material/Alert';
import Slide, { type SlideProps } from '@mui/material/Slide';

interface ToastState {
  open: boolean;
  message: string;
  severity: AlertColor;
  key: number;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  show: (message: string, severity?: AlertColor) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

function SlideUp(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
    key: 0,
  });

  const show = useCallback((message: string, severity: AlertColor = 'info') => {
    // Bump key so a rapid second toast re-triggers the enter transition.
    setState((s) => ({ open: true, message, severity, key: s.key + 1 }));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (m) => show(m, 'success'),
      error: (m) => show(m, 'error'),
      info: (m) => show(m, 'info'),
    }),
    [show],
  );

  const handleClose = (_?: unknown, reason?: string) => {
    if (reason === 'clickaway') return;
    setState((s) => ({ ...s, open: false }));
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Snackbar
        key={state.key}
        open={state.open}
        autoHideDuration={state.severity === 'error' ? 7000 : 4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slots={{ transition: SlideUp }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ boxShadow: 6, alignItems: 'center' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
