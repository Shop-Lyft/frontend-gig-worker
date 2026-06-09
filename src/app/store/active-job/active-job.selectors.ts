import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ActiveJobState } from './active-job.reducer';

export const selectActiveJobState = createFeatureSelector<ActiveJobState>('active-job');

export const selectActiveJob = createSelector(
  selectActiveJobState,
  (state) => state.data
);

export const selectActiveJobLoading = createSelector(
  selectActiveJobState,
  (state) => state.loading
);

export const selectActiveJobError = createSelector(
  selectActiveJobState,
  (state) => state.error
);

export const selectActiveJobLastFetchedAt = createSelector(
  selectActiveJobState,
  (state) => state.lastFetchedAt
);

export const selectPicklist = createSelector(
  selectActiveJobState,
  (state) => state.picklist
);

export const selectPicklistLoading = createSelector(
  selectActiveJobState,
  (state) => state.picklistLoading
);

export const selectPicklistError = createSelector(
  selectActiveJobState,
  (state) => state.picklistError
);

export const selectSubstitutions = createSelector(
  selectActiveJobState,
  (state) => state.substitutions
);

export const selectHasActiveJob = createSelector(
  selectActiveJob,
  (job) => job !== null
);

export const selectActiveJobType = createSelector(
  selectActiveJob,
  (job) => job?.jobType ?? null
);

export const selectAllEligibleItemsPicked = createSelector(
  selectPicklist,
  selectSubstitutions,
  (picklist, substitutions) => {
    if (!picklist || picklist.length === 0) {
      return false;
    }

    return picklist.every((item) => {
      // Items that are skipped (rejected/timed out substitutions) don't count
      if (item.status === 'skipped') {
        return true;
      }
      // Items with approved substitutions are considered done
      if (item.status === 'substituted') {
        return true;
      }
      // Items with pending substitution aren't done yet
      const sub = substitutions[item.id];
      if (sub && sub.status === 'pending') {
        return false;
      }
      // Regular items must be picked
      return item.status === 'picked';
    });
  }
);

export const selectPicklistProgress = createSelector(
  selectPicklist,
  (picklist) => {
    if (!picklist || picklist.length === 0) {
      return { total: 0, completed: 0 };
    }

    const total = picklist.length;
    const completed = picklist.filter(
      (item) => item.status === 'picked' || item.status === 'substituted' || item.status === 'skipped'
    ).length;

    return { total, completed };
  }
);

export const selectSubstitutionStatusForItem = (itemId: string) =>
  createSelector(selectSubstitutions, (substitutions) => substitutions[itemId] ?? null);
