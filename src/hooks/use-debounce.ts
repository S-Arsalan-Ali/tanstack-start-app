import { useState, useEffect } from "react";

/**
 * Custom hook to debounce updates to a state value.
 * @param value The value to be debounced.
 * @param delay The delay in milliseconds (defaults to 300ms).
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
