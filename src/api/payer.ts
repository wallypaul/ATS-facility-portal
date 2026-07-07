// Payer-portal API. Every call returns parsed types; components never touch axios.

import { api } from './client';
import type {
  BookingCreatedResponse,
  BookingDetail,
  BookingListItem,
  InvoiceDetail,
  InvoiceListItem,
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

export async function getBookings(): Promise<BookingListItem[]> {
  const { data } = await api.get<BookingListItem[]>('/api/payer/bookings/');
  return data;
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

export async function getTrips(filters: TripFilters = {}): Promise<Trip[]> {
  const params: Record<string, string> = {};
  if (filters.date) params.date = filters.date;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  const { data } = await api.get<Trip[]>('/api/payer/trips/', {
    params: Object.keys(params).length ? params : undefined,
  });
  return data;
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

export async function getInvoices(): Promise<InvoiceListItem[]> {
  const { data } = await api.get<InvoiceListItem[]>('/api/payer/invoices/');
  return data;
}

export async function getInvoice(uuid: string): Promise<InvoiceDetail> {
  const { data } = await api.get<InvoiceDetail>(`/api/payer/invoices/${uuid}/`);
  return data;
}
