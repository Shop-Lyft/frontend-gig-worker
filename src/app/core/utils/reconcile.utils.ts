import { Job } from '../models/job.model';

/**
 * Reconciles two job lists by merging incoming jobs into the current list.
 * - Adds new jobs from incoming that are not in current
 * - Removes jobs from current that are not in incoming (stale)
 * - Ensures no duplicates (by id)
 *
 * The result contains only jobs that exist in the incoming list,
 * preserving any enriched data from the current list for jobs that appear in both.
 *
 * @param current - The current displayed job list
 * @param incoming - The fresh job list from the server/WebSocket
 * @returns Reconciled job list with no duplicates
 */
export function reconcileJobList(current: Job[], incoming: Job[]): Job[] {
  const currentMap = new Map<string, Job>();
  for (const job of current) {
    currentMap.set(job.id, job);
  }

  const incomingIds = new Set<string>();
  const result: Job[] = [];

  for (const job of incoming) {
    if (incomingIds.has(job.id)) {
      // Skip duplicates within the incoming list itself
      continue;
    }
    incomingIds.add(job.id);

    // Prefer current version if it exists (may have computed fields like distance),
    // otherwise use the incoming version
    const existing = currentMap.get(job.id);
    result.push(existing ?? job);
  }

  return result;
}
