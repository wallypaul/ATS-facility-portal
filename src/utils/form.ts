import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { parseApiError, prettifyField } from './errors';

// Push server 400 field errors onto matching RHF fields (server paths are already
// dotted, e.g. "passenger.dob", "tripsData.0.date"). Anything that doesn't match a
// known form field is returned so the page can show it in a form-level alert.
export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  validFields: readonly string[],
): { detail?: string; unmapped: string[] } {
  const parsed = parseApiError(error);
  const valid = new Set(validFields);
  const unmapped: string[] = [];

  for (const [field, msg] of Object.entries(parsed.fields)) {
    if (valid.has(field)) {
      setError(field as Path<T>, { type: 'server', message: msg });
    } else {
      unmapped.push(`${prettifyField(field)}: ${msg}`);
    }
  }
  return { detail: parsed.detail, unmapped };
}
