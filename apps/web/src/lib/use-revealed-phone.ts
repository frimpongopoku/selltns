"use client";

import { useSyncExternalStore } from "react";
import { revealPhone } from "./phone";

// Decodes an obscured phone number only on the client, never during SSR —
// useSyncExternalStore's server snapshot deliberately stays `null` so the
// value present in the server-rendered HTML/RSC payload is always the
// encoded token, not the real number.
const noopSubscribe = () => () => {};

export function useRevealedPhone(encoded: string | null): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => (encoded ? revealPhone(encoded) : null),
    () => null,
  );
}
