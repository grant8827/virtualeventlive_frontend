import { useEffect, useState } from 'react'

// Returns `value` once it has stopped changing for `delay` ms — keeps the
// search boxes from firing a request per keystroke.
export default function useDebounced(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
