/**
 * Cache staleness utilities for stale-while-revalidate pattern.
 *
 * Strategy:
 * - If lastFetchedAt < 2 minutes ago → cache is fresh, display cached data and background refresh
 * - If lastFetchedAt > 2 minutes ago (or null) → cache is stale, show loading spinner
 */

const STALENESS_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Determines whether the cache is stale based on the last fetch timestamp.
 * Returns true if data has never been fetched or was fetched more than 2 minutes ago.
 */
export function isCacheStale(lastFetchedAt: number | null): boolean {
  if (lastFetchedAt === null) return true;
  return Date.now() - lastFetchedAt > STALENESS_THRESHOLD_MS;
}

/**
 * Determines whether to show a loading spinner.
 * Show loading when cache is stale (no cached data to display or data is too old).
 * When cache is fresh, components should display cached data while refreshing in the background.
 */
export function shouldShowLoading(lastFetchedAt: number | null): boolean {
  return isCacheStale(lastFetchedAt);
}

/**
 * Determines whether a background refresh should occur.
 * Returns true when cached data exists but may be slightly outdated (always refresh on load).
 */
export function shouldBackgroundRefresh(lastFetchedAt: number | null): boolean {
  return lastFetchedAt !== null && !isCacheStale(lastFetchedAt);
}

export const STALENESS_THRESHOLD = STALENESS_THRESHOLD_MS;
