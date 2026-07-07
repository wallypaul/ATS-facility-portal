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
  type TripFilters,
} from '../api/payer';
import { changePassword } from '../api/auth';
import { queryKeys } from './keys';
import type {
  BookingDetail,
  BookingRequest,
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

export function useBookings() {
  return useQuery({ queryKey: queryKeys.bookings(), queryFn: getBookings });
}

export function useBooking(ref: string) {
  return useQuery({
    queryKey: queryKeys.booking(ref),
    queryFn: () => getBooking(ref),
    enabled: Boolean(ref),
  });
}

export function useTrips(filters: TripFilters) {
  return useQuery({
    queryKey: queryKeys.trips(filters),
    queryFn: () => getTrips(filters),
    placeholderData: (prev) => prev, // keep old rows visible while refiltering
  });
}

export function useInvoices() {
  return useQuery({ queryKey: queryKeys.invoices(), queryFn: getInvoices });
}

export function useInvoice(uuid: string) {
  return useQuery({
    queryKey: queryKeys.invoice(uuid),
    queryFn: () => getInvoice(uuid),
    enabled: Boolean(uuid),
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
  trips: [readonly unknown[], Trip[] | undefined][];
  bookings: [readonly unknown[], BookingDetail | undefined][];
}

function snapshotTripCaches(qc: QueryClient): TripCacheSnapshot {
  return {
    trips: qc.getQueriesData<Trip[]>({ queryKey: ['trips'] }),
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
  qc.setQueriesData<Trip[]>({ queryKey: ['trips'] }, (list) =>
    list
      ? list.map((t) => (t.uuid === uuid ? transform(t) : t)).filter((t): t is Trip => t !== null)
      : list,
  );
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
