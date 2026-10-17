"use client";

import { useCallback, useEffect, useRef } from "react";

/** Measures how long a form has been open — a lightweight bot signal sent with submissions. */
export function useFormTimer() {
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  return useCallback(() => (startedAt.current ? Date.now() - startedAt.current : 0), []);
}
