import { z } from 'zod';
import dayjs, { type Dayjs } from 'dayjs';

const isValidDayjs = (v: unknown): v is Dayjs => dayjs.isDayjs(v) && v.isValid();

// A required, valid Dayjs date/time. Extra constraints chain via .refine so the
// "required" message wins when the field is empty and the constraint message wins
// only once a real value is present.
export const dobSchema = z
  .custom<Dayjs>(isValidDayjs, 'Date of birth is required')
  .refine((v) => v.isBefore(dayjs().startOf('day')), 'Date of birth must be in the past');

export const tripDateSchema = z
  .custom<Dayjs>(isValidDayjs, 'Date is required')
  .refine((v) => !v.isBefore(dayjs().startOf('day')), 'Date must be today or later');

export const timeSchema = z.custom<Dayjs>(isValidDayjs, 'Time is required');

// Optional Dayjs (nullable) for filters etc.
export const optionalDate = z.custom<Dayjs | null>(
  (v) => v == null || isValidDayjs(v),
  'Invalid date',
);

export const API_DATE = 'YYYY-MM-DD';
export const API_TIME = 'HH:mm';
