"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}

const currentSecond = () => Math.floor(Date.now() / 1000);

// The current time in whole seconds, or null during server rendering so the
// server and browser never disagree about the clock.
export function useNowSeconds(): number | null {
  return useSyncExternalStore(subscribe, currentSecond, () => null);
}
