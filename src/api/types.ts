// Types mirror the ATS payer-portal API exactly (see doc/payer-portal-flow.md and
// the Django serializers). Field names are the server's — do not "tidy" them.

// DRF paginated list envelope. `next`/`previous` are absolute URLs (or null at
// the ends); `count` is the total across all pages.
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: string | null; // "payer" for portal users
  is_active: boolean;
  date_joined: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export interface ServiceLevel {
  code: string;
  name: string;
}

export interface ServicesResponse {
  payer: string; // display name
  services: ServiceLevel[];
}

// POST /api/payer/quote/ — all numeric fields arrive as strings (Decimal) or float.
export interface Quote {
  distance: string; // e.g. "5.2" (miles, text)
  distance_miles: string; // Decimal as string
  duration: string; // e.g. "12 mins"
  hours: number;
  price: string; // Decimal as string — server-set, read-only
  service_level: string;
  payer: string;
}

export interface Passenger {
  firstName: string;
  lastName: string;
  email: string;
  phone_1: string;
  phone_2?: string;
  dob: string; // YYYY-MM-DD
}

export interface ServiceData {
  service: string; // service id, e.g. "2"
  passengers: number;
  companion?: string | number;
  comments?: string;
}

// What a PAYER reads for a trip: the full planned trip + pricing, PLUS the four
// driver-recorded actuals (null until recorded). Read-only; a payer edits only
// logistics via TripEditInput. price/distance are Decimal-as-string; distance is
// miles; duration is text. See doc/frontend-trip-uuid-and-actuals.md.
export interface Trip {
  uuid: string;
  booking_ref: string;
  pick_up_address: string;
  drop_off_address: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  price: string | null;
  distance: string | null; // miles
  duration: string | null;
  actual_pick_up_address: string | null;
  actual_pick_up_time: string | null; // HH:mm:ss
  actual_drop_off_address: string | null;
  actual_drop_off_time: string | null;
}

export interface BookingListItem {
  ref: string;
  status: string;
  payment_status: string;
  source: string;
  created_at: string;
  passenger_name: string;
  payer: string | null;
  trips_count: number;
}

export interface BookingDetail {
  ref: string;
  status: string;
  payment_status: string;
  source: string;
  created_at: string;
  payer: string | null;
  passenger: Passenger;
  serviceData: ServiceData;
  trips: Trip[];
}

export interface BookingCreatedResponse {
  ref: string;
  status: string;
  trips_count: number;
}

export interface InvoiceListItem {
  uuid: string;
  invoice_number: string;
  status: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  amount_paid: string;
  created_at: string;
  payer: string | null;
}

export interface InvoiceLine {
  uuid: string;
  description: string;
  quantity: string;
  unit_price: string;
  amount: string;
  trip_id: number | null;
}

export interface InvoiceDetail extends InvoiceListItem {
  notes: string | null;
  lines: InvoiceLine[];
}

// --- Request payloads ---

export interface QuoteRequest {
  service_level: string;
  origin: string;
  destination: string;
  payer_uuid?: string;
}

export interface TripInput {
  pick_up_address: string;
  drop_off_address: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  service_level?: string;
}

export interface BookingRequest {
  passenger: Passenger;
  serviceData: ServiceData;
  tripsData: TripInput[];
  payer_uuid?: string;
  source?: string;
}

export interface TripEditInput {
  pick_up_address?: string;
  drop_off_address?: string;
  date?: string;
  time?: string;
}

// Server 400 shape: { field: [msg, ...] } and/or { detail: "..." }
export type FieldErrors = Record<string, string[] | string>;
