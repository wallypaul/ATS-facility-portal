import TextField, { type TextFieldProps } from '@mui/material/TextField';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
} & Omit<TextFieldProps, 'name' | 'error' | 'helperText' | 'value' | 'onChange' | 'ref'>;

// RHF-controlled MUI TextField. Field errors (client zod or server-injected via
// setError) render as helperText and are linked to the input by MUI (aria-describedby).
export function FormTextField<T extends FieldValues>({
  name,
  control,
  label,
  helperText,
  ...rest
}: Props<T> & { helperText?: string }) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <TextField
      {...rest}
      {...field}
      value={field.value ?? ''}
      label={label}
      error={Boolean(error)}
      helperText={error?.message ?? helperText ?? ' '}
      fullWidth
      size="small"
    />
  );
}
