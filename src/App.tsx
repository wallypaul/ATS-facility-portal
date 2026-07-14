import {
  createBrowserRouter,
  isRouteErrorResponse,
  Navigate,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';

import { AppShell } from './components/AppShell';
import { RequirePayer } from './auth/RequirePayer';
import { LoginPage } from './pages/login/LoginPage';
import { BookPage } from './pages/book/BookPage';
import { BookingsPage } from './pages/bookings/BookingsPage';
import { BookingDetailPage } from './pages/bookings/BookingDetailPage';
import { TripsPage } from './pages/trips/TripsPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { InvoiceDetailPage } from './pages/invoices/InvoiceDetailPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

// App-wide error boundary. Any render/loader error in any route bubbles here, so
// the user sees a real recovery screen instead of React Router's raw default.
// Reload re-initializes providers (which also clears a transient module-load
// glitch); "Back to app" is a full navigation for a clean slate.
function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'The page hit an unexpected problem. Reloading usually clears it.';
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100dvh', p: 3 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 460 }}>
        <ErrorOutlineIcon sx={{ fontSize: 44, color: 'error.main' }} aria-hidden />
        <Typography variant="h2">Something went wrong</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {message}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Button variant="outlined" component="a" href="/">
            Back to app
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

// The drawer + header (AppShell) is a shared parent to every protected route, so
// it's rendered once and reused; RequirePayer guards the whole subtree. The
// pathless root route carries the errorElement so it covers login + app alike.
const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: (
          <RequirePayer>
            <AppShell />
          </RequirePayer>
        ),
        children: [
          { index: true, element: <Navigate to="/bookings" replace /> },
          { path: 'book', element: <BookPage /> },
          { path: 'bookings', element: <BookingsPage /> },
          { path: 'bookings/:ref', element: <BookingDetailPage /> },
          { path: 'trips', element: <TripsPage /> },
          { path: 'invoices', element: <InvoicesPage /> },
          { path: 'invoices/:uuid', element: <InvoiceDetailPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
