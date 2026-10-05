/**
 * Minimum-visible helper for busy states.
 *
 * Local requests often finish in <50ms, so a spinner that unmounts the
 * instant the request completes is never perceivable (it reads as a glitch).
 * Create a timer when the busy state starts and `await vis()` right before
 * clearing it / navigating: the busy UI then stays up for at least `ms`
 * total, while naturally slow requests are never delayed.
 *
 *   const vis = minVisible();
 *   setSubmitting(true);
 *   ...
 *   await vis();
 *   setSubmitting(false);
 */
export function minVisible(ms = 500): () => Promise<void> {
  const started = Date.now();
  return () =>
    new Promise<void>((resolve) => {
      const left = ms - (Date.now() - started);
      if (left <= 0) resolve();
      else setTimeout(resolve, left);
    });
}
