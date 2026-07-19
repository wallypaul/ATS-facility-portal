import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import {
  addTripToBooking,
  cancelTrip,
  createBooking,
  editTrip,
  getBooking,
  getBookings,
  getInvoice,
  getInvoices,
  getQuote,
  getServices,
  getTrips,
  payInvoice,
  type BookingFilters,
  type InvoiceFilters,
  type PageParams,
  type TripFilters,
} from '../api/payer';
import { changePassword } from '../api/auth';
import { queryKeys } from './keys';
import type {
  BookingDetail,
  BookingRequest,
  InvoiceDetail,
  Paginated,
  Quote,
  QuoteRequest,
  Trip,
  TripEditInput,
  TripInput,
} from '../api/types';

// --- Queries ---

export function useServices(payerUuid?: string) {
  return useQuery({
    queryKey: queryKeys.services(payerUuid),
    queryFn: () => getServices(payerUuid),
    staleTime: 5 * 60 * 1000, // service levels rarely change within a session
  });
}

export function useBookings(filters: BookingFilters, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.bookings(filters, params),
    queryFn: () => getBookings(filters, params),
    placeholderData: (prev) => prev, // keep the current page visible while the next loads
  });
}

export function useBooking(ref: string) {
  return useQuery({
    queryKey: queryKeys.booking(ref),
    queryFn: () => getBooking(ref),
    enabled: Boolean(ref),
  });
}

export function useTrips(filters: TripFilters, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.trips(filters, params),
    queryFn: () => getTrips(filters, params),
    placeholderData: (prev) => prev, // keep old rows visible while refiltering / paging
  });
}

export function useInvoices(filters: InvoiceFilters, params: PageParams) {
  return useQuery({
    queryKey: queryKeys.invoices(filters, params),
    queryFn: () => getInvoices(filters, params),
    placeholderData: (prev) => prev, // keep the current page visible while the next loads
  });
}

export function useInvoice(uuid: string) {
  return useQuery({
    queryKey: queryKeys.invoice(uuid),
    queryFn: () => getInvoice(uuid),
    enabled: Boolean(uuid),
  });
}

// Pay a SENT invoice. On success the server returns the updated invoice; write
// it straight into the detail cache (new amount_paid / status) and refresh the
// list so its balances/status stay honest.
export function usePayInvoice(uuid: string) {
  const qc = useQueryClient();
  return useMutation<InvoiceDetail, unknown, string>({
    mutationFn: (sourceId) => payInvoice(uuid, sourceId),
    onSuccess: (updated) => {
      qc.setQueryData(queryKeys.invoice(uuid), updated);
      qc.invalidateQueries({ queryKey: queryKeys.invoices() });
    },
  });
}

// --- Mutations ---

export function useQuote() {
  return useMutation<Quote, unknown, QuoteRequest>({ mutationFn: getQuote });
}

export function useBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BookingRequest) => createBooking(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bookings() });
      qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useAddTrip(ref: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TripInput) => addTripToBooking(ref, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.booking(ref) });
      qc.invalidateQueries({ queryKey: queryKeys.bookings() });
      qc.invalidateQueries({ queryKey: ['trips'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (v: { current_password: string; new_password: string }) =>
      changePassword(v.current_password, v.new_password),
  });
}

// --- Optimistic trip edit / cancel ---
// Trips appear in two cache families: the ['trips', filters] lists and each
// ['booking', ref] detail. We patch both, snapshot for rollback, then resync.

interface TripCacheSnapshot {
  trips: [readonly unknown[], Paginated<Trip> | undefined][];
  bookings: [readonly unknown[], BookingDetail | undefined][];
}

function snapshotTripCaches(qc: QueryClient): TripCacheSnapshot {
  return {
    trips: qc.getQueriesData<Paginated<Trip>>({ queryKey: ['trips'] }),
    bookings: qc.getQueriesData<BookingDetail>({ queryKey: ['booking'] }),
  };
}

function restoreTripCaches(qc: QueryClient, snap: TripCacheSnapshot) {
  snap.trips.forEach(([key, data]) => qc.setQueryData(key, data));
  snap.bookings.forEach(([key, data]) => qc.setQueryData(key, data));
}

function applyToTripCaches(
  qc: QueryClient,
  uuid: string,
  transform: (trip: Trip) => Trip | null, // null => remove the trip
) {
  // Trip lists are now paginated envelopes: patch `results`, and drop `count` by
  // however many rows the transform removed so "X of Y" stays honest until resync.
  qc.setQueriesData<Paginated<Trip>>({ queryKey: ['trips'] }, (page) => {
    if (!page) return page;
    const results = page.results
      .map((t) => (t.uuid === uuid ? transform(t) : t))
      .filter((t): t is Trip => t !== null);
    const removed = page.results.length - results.length;
    return { ...page, results, count: Math.max(0, page.count - removed) };
  });
  qc.setQueriesData<BookingDetail>({ queryKey: ['booking'] }, (detail) =>
    detail
      ? {
          ...detail,
          trips: detail.trips
            .map((t) => (t.uuid === uuid ? transform(t) : t))
            .filter((t): t is Trip => t !== null),
        }
      : detail,
  );
}

async function beforeOptimistic(qc: QueryClient) {
  await qc.cancelQueries({ queryKey: ['trips'] });
  await qc.cancelQueries({ queryKey: ['booking'] });
  return snapshotTripCaches(qc);
}

function resyncTripCaches(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['trips'] });
  qc.invalidateQueries({ queryKey: ['booking'] });
}

export function useEditTrip() {
  const qc = useQueryClient();
  return useMutation<Trip, unknown, { uuid: string; input: TripEditInput }, TripCacheSnapshot>({
    mutationFn: ({ uuid, input }) => editTrip(uuid, input),
    onMutate: async ({ uuid, input }) => {
      const snap = await beforeOptimistic(qc);
      applyToTripCaches(qc, uuid, (t) => ({ ...t, ...input }));
      return snap;
    },
    onError: (_e, _v, snap) => {
      if (snap) restoreTripCaches(qc, snap);
    },
    onSettled: () => resyncTripCaches(qc),
  });
}

export function useCancelTrip() {
  const qc = useQueryClient();
  return useMutation<void, unknown, { uuid: string }, TripCacheSnapshot>({
    mutationFn: ({ uuid }) => cancelTrip(uuid),
    onMutate: async ({ uuid }) => {
      const snap = await beforeOptimistic(qc);
      applyToTripCaches(qc, uuid, () => null); // optimistic remove
      return snap;
    },
    onError: (_e, _v, snap) => {
      if (snap) restoreTripCaches(qc, snap);
    },
    onSettled: () => {
      resyncTripCaches(qc);
      qc.invalidateQueries({ queryKey: queryKeys.bookings() }); // trips_count changed
    },
  });
}
