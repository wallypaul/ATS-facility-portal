import type { TripFilters } from '../api/payer';

export const queryKeys = {
  services: (payerUuid?: string) => ['services', payerUuid ?? null] as const,
  bookings: () => ['bookings'] as const,
  booking: (ref: string) => ['booking', ref] as const,
  trips: (filters: TripFilters) => ['trips', filters] as const,
  invoices: () => ['invoices'] as const,
  invoice: (uuid: string) => ['invoice', uuid] as const,
};
