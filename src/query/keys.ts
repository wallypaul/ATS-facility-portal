import type { BookingFilters, InvoiceFilters, PageParams, TripFilters } from '../api/payer';

// List keys take optional filters/pagination so each page caches separately. Called
// with no args they return the bare prefix (['bookings'], ['trips', filters]) —
// mutations invalidate on that prefix to sweep every cached page at once.
export const queryKeys = {
  services: (payerUuid?: string) => ['services', payerUuid ?? null] as const,
  bookings: (filters?: BookingFilters, params?: PageParams) =>
    !filters
      ? (['bookings'] as const)
      : params
        ? (['bookings', filters, params] as const)
        : (['bookings', filters] as const),
  booking: (ref: string) => ['booking', ref] as const,
  trips: (filters: TripFilters, params?: PageParams) =>
    params ? (['trips', filters, params] as const) : (['trips', filters] as const),
  invoices: (filters?: InvoiceFilters, params?: PageParams) =>
    !filters
      ? (['invoices'] as const)
      : params
        ? (['invoices', filters, params] as const)
        : (['invoices', filters] as const),
  invoice: (uuid: string) => ['invoice', uuid] as const,
};
