/**
 * Exponential backoff utility for WebSocket reconnection.
 *
 * Formula: min(2^(attempt - 1) * 1000, 30000) ms
 * - attempt is 1-indexed (first retry = attempt 1)
 * - Maximum delay capped at 30 seconds
 */

const MAX_BACKOFF_MS = 30000;

/**
 * Calculates the reconnection delay in milliseconds using exponential backoff.
 *
 * @param attempt - The reconnection attempt number (1-indexed)
 * @returns Delay in milliseconds: min(2^(attempt-1) * 1000, 30000)
 */
export function calculateBackoff(attempt: number): number {
  if (attempt < 1) {
    return 1000;
  }
  const delay = Math.pow(2, attempt - 1) * 1000;
  return Math.min(delay, MAX_BACKOFF_MS);
}

export const MAX_RECONNECT_ATTEMPTS = 10;
export const MAX_BACKOFF_DELAY = MAX_BACKOFF_MS;
