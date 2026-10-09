// Small binary fixtures shared by the export and image tests.

/** A 1 by 1 transparent PNG, the smallest image the exporters can embed. */
export const PNG_1X1: ArrayBuffer = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
).buffer;
