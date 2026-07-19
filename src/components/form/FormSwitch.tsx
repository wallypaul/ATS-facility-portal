import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
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
};

// RHF-controlled MUI Switch, for boolean fields alongside FormTextField/FormSelect.
export function FormSwitch<T extends FieldValues>({ name, control, label }: Props<T>) {
  const { field } = useController({ name, control });

  return (
    <FormControlLabel
      control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
      label={label}
    />
  );
}
