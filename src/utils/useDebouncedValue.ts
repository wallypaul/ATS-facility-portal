import { useEffect, useState } from 'react';

// Delays reflecting a fast-changing value (e.g. a search box) so callers
// (like a server-filtered query) don't re-fire on every keystroke.
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
