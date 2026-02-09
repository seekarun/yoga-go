"use client";

import { useRef, useState, useCallback } from "react";

export interface HoneypotInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style: React.CSSProperties;
  tabIndex: number;
  "aria-hidden": boolean;
  autoComplete: string;
}

/**
 * Client-side spam protection hook.
 * Provides a hidden honeypot input and a timing field.
 *
 * Usage:
 *   const { honeypotProps, getSpamFields } = useSpamProtection();
 *   <input {...honeypotProps} />
 *   onSubmit: () => fetch(..., { body: { ...formData, ...getSpamFields() } })
 */
export function useSpamProtection(): {
  honeypotProps: HoneypotInputProps;
  getSpamFields: () => { _hp: string; _t: string };
} {
  const loadTime = useRef(Date.now());
  const [honeypotValue, setHoneypotValue] = useState("");

  const honeypotProps: HoneypotInputProps = {
    name: "website",
    value: honeypotValue,
    onChange: useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) =>
        setHoneypotValue(e.target.value),
      [],
    ),
    style: { position: "absolute", left: "-9999px", opacity: 0 },
    tabIndex: -1,
    "aria-hidden": true,
    autoComplete: "off",
  };

  const getSpamFields = useCallback(
    () => ({
      _hp: honeypotValue,
      _t: btoa(String(loadTime.current)),
    }),
    [honeypotValue],
  );

  return { honeypotProps, getSpamFields };
}
