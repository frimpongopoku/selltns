"use client";

// Lightweight pub/sub between sibling client islands on the same page (e.g.
// a quick-create dialog in the page header and an explorer that owns the
// list) so a newly created item shows up immediately without a full reload.
export function createEventChannel<T>(eventName: string) {
  function emit(detail: T) {
    window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
  }

  function on(handler: (detail: T) => void) {
    function listener(event: Event) {
      handler((event as CustomEvent<T>).detail);
    }
    window.addEventListener(eventName, listener);
    return () => window.removeEventListener(eventName, listener);
  }

  return { emit, on };
}
