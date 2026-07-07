import TextField, { type TextFieldProps } from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

export interface SelectOption {
  value: string;
  label: string;
}

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  helperText?: string;
} & Omit<TextFieldProps, 'name' | 'error' | 'helperText' | 'value' | 'onChange' | 'select' | 'ref'>;

export function FormSelect<T extends FieldValues>({
  name,
  control,
  label,
  options,
  placeholder,
  helperText,
  ...rest
}: Props<T>) {
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <TextField
      {...rest}
      {...field}
      value={field.value ?? ''}
      select
      label={label}
      error={Boolean(error)}
      helperText={error?.message ?? helperText ?? ' '}
      fullWidth
      size="small"
      slotProps={{ select: { displayEmpty: Boolean(placeholder) } }}
    >
      {placeholder && (
        <MenuItem value="" disabled>
          {placeholder}
        </MenuItem>
      )}
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
