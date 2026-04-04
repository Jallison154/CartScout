type InvalidateHandler = () => void;

let handler: InvalidateHandler | null = null;

export function setSessionInvalidateHandler(fn: InvalidateHandler | null): void {
  handler = fn;
}

/** Called when tokens are cleared outside AuthProvider (e.g. failed refresh on API). */
export function notifySessionInvalidated(): void {
  try {
    handler?.();
  } catch {
    /* ignore */
  }
}
