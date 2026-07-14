// Payer-portal API. Every call returns parsed types; components never touch axios.

import { AxiosError } from 'axios';
import { api } from './client';
import type {
  BookingCreatedResponse,
  BookingDetail,
  BookingListItem,
  InvoiceDetail,
  InvoiceListItem,
  Paginated,
  Quote,
  QuoteRequest,
  BookingRequest,
  ServicesResponse,
  Trip,
  TripEditInput,
  TripInput,
} from './types';

export interface TripFilters {
  date?: string; // exact YYYY-MM-DD
  from?: string;
  to?: string;
}

export interface PageParams {
  page?: number; // 1-based; server default 1
  page_size?: number; // server default 50, capped at 200
}

function pageParams(p: PageParams): Record<string, number> {
  const out: Record<string, number> = {};
  if (p.page) out.page = p.page;
  if (p.page_size) out.page_size = p.page_size;
  return out;
}

// GET a paginated list. A request past the last page returns 404
// {"detail":"Invalid page."} — the API's way of saying "no more rows". We treat
// that as an empty page (the caller clamps back to the last valid page), and let
// any other 404 shape surface as a real error.
async function fetchPage<T>(
  url: string,
  params: Record<string, string | number>,
): Promise<Paginated<T>> {
  try {
    const { data } = await api.get<Paginated<T>>(url, {
      params: Object.keys(params).length ? params : undefined,
    });
    return data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) {
      const detail = (err.response.data as { detail?: string } | undefined)?.detail;
      if (!detail || /invalid page/i.test(detail)) {
        return { count: 0, next: null, previous: null, results: [] };
      }
    }
    throw err;
  }
}

export async function getServices(payerUuid?: string): Promise<ServicesResponse> {
  const { data } = await api.get<ServicesResponse>('/api/payer/services/', {
    params: payerUuid ? { payer_uuid: payerUuid } : undefined,
  });
  return data;
}

export async function getQuote(body: QuoteRequest): Promise<Quote> {
  const { data } = await api.post<Quote>('/api/payer/quote/', body);
  return data;
}

export async function createBooking(body: BookingRequest): Promise<BookingCreatedResponse> {
  const { data } = await api.post<BookingCreatedResponse>('/api/payer/booking/', body);
  return data;
}

export async function getBookings(params: PageParams = {}): Promise<Paginated<BookingListItem>> {
  return fetchPage<BookingListItem>('/api/payer/bookings/', pageParams(params));
}

export async function getBooking(ref: string): Promise<BookingDetail> {
  const { data } = await api.get<BookingDetail>(`/api/payer/bookings/${encodeURIComponent(ref)}/`);
  return data;
}

export async function addTripToBooking(ref: string, body: TripInput): Promise<Trip> {
  const { data } = await api.post<Trip>(
    `/api/payer/bookings/${encodeURIComponent(ref)}/trips/`,
    body,
  );
  return data;
}

export async function getTrips(
  filters: TripFilters = {},
  page: PageParams = {},
): Promise<Paginated<Trip>> {
  const params: Record<string, string | number> = {};
  if (filters.date) params.date = filters.date;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (page.page) params.page = page.page;
  if (page.page_size) params.page_size = page.page_size;
  return fetchPage<Trip>('/api/payer/trips/', params);
}

export async function getTrip(uuid: string): Promise<Trip> {
  const { data } = await api.get<Trip>(`/api/payer/trips/${uuid}/`);
  return data;
}

export async function editTrip(uuid: string, body: TripEditInput): Promise<Trip> {
  const { data } = await api.patch<Trip>(`/api/payer/trips/${uuid}/`, body);
  return data;
}

export async function cancelTrip(uuid: string): Promise<void> {
  await api.delete(`/api/payer/trips/${uuid}/`);
}

export async function getInvoices(params: PageParams = {}): Promise<Paginated<InvoiceListItem>> {
  return fetchPage<InvoiceListItem>('/api/payer/invoices/', pageParams(params));
}

export async function getInvoice(uuid: string): Promise<InvoiceDetail> {
  const { data } = await api.get<InvoiceDetail>(`/api/payer/invoices/${uuid}/`);
  return data;
}

// Pay a SENT invoice online. `source_id` is the Square card nonce (`cnon:…`)
// tokenized in the browser — the raw card never reaches us. The server charges
// the current outstanding balance; no client amount is sent. Returns the updated
// invoice (200), or throws 400 (not payable) / 402 (card declined) / 404.
export async function payInvoice(uuid: string, sourceId: string): Promise<InvoiceDetail> {
  const { data } = await api.post<InvoiceDetail>(`/api/payer/invoices/${uuid}/pay/`, {
    source_id: sourceId,
  });
  return data;
}
