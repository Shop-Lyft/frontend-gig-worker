import { PickItem } from '../models/picklist.model';
import { SubstitutionStatus } from '../models/picklist.model';

/**
 * Determines whether the "Mark All Picked" button should be enabled.
 *
 * The button is enabled when ALL non-skipped items are either picked or
 * have an approved/completed substitution:
 * - Items with status 'picked' → eligible, counted as done
 * - Items with status 'skipped' → excluded from check (don't count)
 * - Items with status 'substituted' → counted as done
 * - Items with a pending substitution → not done
 * - Items with status 'pending' → not done (must be picked)
 *
 * @param items - The pick list items
 * @param substitutions - Map of item IDs to their substitution status
 * @returns true when all non-skipped items are either picked or substituted
 */
export function isMarkAllPickedEnabled(
  items: PickItem[],
  substitutions: Record<string, SubstitutionStatus>
): boolean {
  if (items.length === 0) {
    return false;
  }

  const eligibleItems = items.filter(item => item.status !== 'skipped');

  if (eligibleItems.length === 0) {
    return false;
  }

  return eligibleItems.every(item => {
    // Already picked or substituted — done
    if (item.status === 'picked' || item.status === 'substituted') {
      return true;
    }

    // Check if there's a substitution for this item
    const substitution = substitutions[item.id];
    if (substitution) {
      // Pending substitution means not done yet
      if (substitution.status === 'pending') {
        return false;
      }
      // Approved substitution counts as done
      if (substitution.status === 'approved') {
        return true;
      }
      // Rejected or timed_out substitutions mean the item is skipped from check
      if (substitution.status === 'rejected' || substitution.status === 'timed_out') {
        return true;
      }
      // Cancelled substitution — item reverts to original state (not done)
      if (substitution.status === 'cancelled') {
        return false;
      }
    }

    // Item is 'pending' or 'unavailable' with no substitution — not done
    return false;
  });
}
