import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { Dayjs } from 'dayjs';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

interface Props<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  disablePast?: boolean;
  disableFuture?: boolean;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  helperText?: string;
}

// RHF-controlled DatePicker. Stores a Dayjs|null in the form; validation lives in
// the zod schema. Errors surface through the picker's textField slot.
export function FormDatePicker<T extends FieldValues>({
  name,
  control,
  label,
  disablePast,
  disableFuture,
  minDate,
  maxDate,
  helperText,
}: Props<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <DatePicker
      label={label}
      value={(field.value as Dayjs | null) ?? null}
      onChange={(v) => field.onChange(v)}
      disablePast={disablePast}
      disableFuture={disableFuture}
      minDate={minDate}
      maxDate={maxDate}
      slotProps={{
        textField: {
          size: 'small',
          fullWidth: true,
          onBlur: field.onBlur,
          inputRef: field.ref,
          error: Boolean(error),
          helperText: error?.message ?? helperText ?? ' ',
        },
      }}
    />
  );
}
