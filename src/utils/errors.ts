// Turn an axios error from the ATS API into something the UI can render.
// DRF returns 400 in several shapes:
//   { field: ["msg"] }                      -> field: msg
//   { field: { sub: ["msg"] } }             -> field.sub: msg      (nested serializer)
//   { field: [ { sub: ["msg"] }, {} ] }     -> field.0.sub: msg    (list serializer, e.g. tripsData)
//   { "detail": "msg" } / { non_field_errors: ["msg"] }  -> top-level detail
//   [ "msg" ]                               -> top-level detail    (ValidationError(str) in a view)
// We flatten field trees to dotted paths so they map straight onto RHF field names.

import { AxiosError } from 'axios';

export interface ParsedApiError {
  status?: number;
  detail?: string; // top-level / non-field message
  fields: Record<string, string>; // dotted path -> first message
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) return firstString(value[0]);
  return typeof value === 'string' ? value : String(value ?? '');
}

// Recursively collect leaf messages into dotted paths. Returns whether anything
// non-field (top-level detail) was found via the out-param object.
function flatten(node: unknown, path: string, out: Record<string, string>): void {
  if (node == null) return;
  if (typeof node === 'string') {
    if (path) out[path] = node;
    return;
  }
  if (Array.isArray(node)) {
    // A list of strings is the leaf error for `path`; a list of objects is a
    // list serializer (index-aligned to the submitted items).
    if (node.every((n) => typeof n === 'string')) {
      if (node.length && path) out[path] = firstString(node);
      return;
    }
    node.forEach((n, i) => flatten(n, path ? `${path}.${i}` : String(i), out));
    return;
  }
  if (typeof node === 'object') {
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      flatten(value, path ? `${path}.${key}` : key, out);
    }
  }
}

export function parseApiError(error: unknown): ParsedApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (!error.response) {
      return { status, detail: 'Network error — could not reach the server.', fields: {} };
    }

    // Top-level array: ValidationError(str) raised in a view.
    if (Array.isArray(data)) {
      return { status, detail: firstString(data), fields: {} };
    }

    if (data && typeof data === 'object') {
      const raw: Record<string, string> = {};
      flatten(data, '', raw);

      let detail: string | undefined;
      const fields: Record<string, string> = {};
      for (const [key, msg] of Object.entries(raw)) {
        if (key === 'detail' || key === 'non_field_errors') detail = msg;
        else fields[key] = msg;
      }
      return { status, detail, fields };
    }

    if (typeof data === 'string' && data) {
      return { status, detail: data, fields: {} };
    }
    return { status, detail: error.message, fields: {} };
  }

  return { detail: 'Something went wrong.', fields: {} };
}

// Human message for a toast / inline banner, with sensible status fallbacks.
export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  const parsed = parseApiError(error);
  if (parsed.detail) return parsed.detail;
  const firstField = Object.entries(parsed.fields)[0];
  if (firstField) return `${prettifyField(firstField[0])}: ${firstField[1]}`;
  switch (parsed.status) {
    case 401:
      return 'Your session expired. Please sign in again.';
    case 403:
      return 'You are not authorized to do that.';
    case 404:
      return 'Not found.';
    default:
      return fallback;
  }
}

export function prettifyField(path: string): string {
  const last = path.split('.').pop() ?? path;
  return last
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
