/**
 * Minimal in-process async mutex, keyed by string.
 *
 * Used to serialise refund submissions per customer. Without it there is a
 * gap between "check the rules against the database" and "save the decision"
 * (the AI calls in between are async), so two simultaneous requests for the
 * same order could both be approved, or a customer could slip past the
 * refund-frequency limit. Holding the lock across check -> AI -> save closes
 * that gap. Requests from different customers never wait on each other.
 *
 * Limitation: this protects a single Node process (which is how the app
 * runs). Scaling to several instances would need a database-level guard.
 */
const tails = new Map<string, Promise<void>>();

export async function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  tails.set(key, tail);

  await previous;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}
