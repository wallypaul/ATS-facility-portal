import { useEffect, useRef } from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { loadGoogleMaps } from '../../utils/loadGoogleMaps';

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
} & Omit<TextFieldProps, 'name' | 'error' | 'helperText' | 'value' | 'onChange' | 'ref' | 'inputRef'>;

// Same RHF binding as FormTextField, plus a Google Places Autocomplete attached
// to the underlying <input> DOM node. Selecting a suggestion writes the picked
// formatted_address back through field.onChange, same as a normal typed value.
export function FormAddressField<T extends FieldValues>({
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

  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef(field);
  fieldRef.current = field;

  useEffect(() => {
    let autocomplete: google.maps.places.Autocomplete | undefined;
    loadGoogleMaps()
      .then(() => {
        if (!inputRef.current) return;
        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address'],
        });
        autocomplete.addListener('place_changed', () => {
          const address = autocomplete?.getPlace()?.formatted_address;
          if (address) fieldRef.current.onChange(address);
        });
      })
      .catch(() => {}); // no key / network: field still works as plain text input
    return () => {
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, []);

  return (
    <TextField
      {...rest}
      {...field}
      inputRef={inputRef}
      value={field.value ?? ''}
      label={label}
      error={Boolean(error)}
      helperText={error?.message ?? helperText ?? ' '}
      fullWidth
      size="small"
    />
  );
}
