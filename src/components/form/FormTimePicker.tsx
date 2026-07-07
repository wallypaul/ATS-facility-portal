import { TimePicker } from '@mui/x-date-pickers/TimePicker';
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
  helperText?: string;
}

export function FormTimePicker<T extends FieldValues>({
  name,
  control,
  label,
  helperText,
}: Props<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <TimePicker
      label={label}
      value={(field.value as Dayjs | null) ?? null}
      onChange={(v) => field.onChange(v)}
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
