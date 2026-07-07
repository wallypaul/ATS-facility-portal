import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

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

// The drawer + header (AppShell) is a shared parent to every protected route, so
// it's rendered once and reused; RequirePayer guards the whole subtree.
const router = createBrowserRouter([
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
]);

export function App() {
  return <RouterProvider router={router} />;
}
