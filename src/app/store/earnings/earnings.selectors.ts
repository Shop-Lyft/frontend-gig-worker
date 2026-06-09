import { createFeatureSelector, createSelector } from '@ngrx/store';
import { EarningsState } from './earnings.reducer';

export const selectEarningsState = createFeatureSelector<EarningsState>('earnings');

export const selectEarningsData = createSelector(
  selectEarningsState,
  (state) => state.data
);

export const selectEarningsLoading = createSelector(
  selectEarningsState,
  (state) => state.loading
);

export const selectEarningsError = createSelector(
  selectEarningsState,
  (state) => state.error
);

export const selectEarningsLastFetchedAt = createSelector(
  selectEarningsState,
  (state) => state.lastFetchedAt
);

export const selectWeeklyEarnings = createSelector(
  selectEarningsData,
  (data) => data?.weeklyEarnings ?? 0
);

export const selectMonthlyEarnings = createSelector(
  selectEarningsData,
  (data) => data?.monthlyEarnings ?? 0
);

export const selectJobsCompletedThisWeek = createSelector(
  selectEarningsData,
  (data) => data?.jobsCompletedThisWeek ?? 0
);

export const selectWorkerRating = createSelector(
  selectEarningsData,
  (data) => data?.workerRating ?? 0
);

export const selectRecentSettlements = createSelector(
  selectEarningsData,
  (data) => data?.recentSettlements ?? []
);

export const selectBankAccountRefMasked = createSelector(
  selectEarningsData,
  (data) => data?.bankAccountRefMasked ?? ''
);
