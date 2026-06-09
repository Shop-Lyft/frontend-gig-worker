import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProfileState } from './profile.reducer';

export const selectProfileState = createFeatureSelector<ProfileState>('profile');

// Profile data selectors
export const selectProfileData = createSelector(
  selectProfileState,
  (state) => state.data
);

export const selectProfileLoading = createSelector(
  selectProfileState,
  (state) => state.loading
);

export const selectProfileError = createSelector(
  selectProfileState,
  (state) => state.error
);

export const selectProfileLastFetchedAt = createSelector(
  selectProfileState,
  (state) => state.lastFetchedAt
);

export const selectProfileUpdateLoading = createSelector(
  selectProfileState,
  (state) => state.updateLoading
);

export const selectProfileUpdateError = createSelector(
  selectProfileState,
  (state) => state.updateError
);

// History selectors
export const selectHistory = createSelector(
  selectProfileState,
  (state) => state.history
);

export const selectHistoryLoading = createSelector(
  selectProfileState,
  (state) => state.historyLoading
);

export const selectHistoryError = createSelector(
  selectProfileState,
  (state) => state.historyError
);

export const selectHistoryPage = createSelector(
  selectProfileState,
  (state) => state.historyPage
);

export const selectHistoryHasMore = createSelector(
  selectProfileState,
  (state) => state.historyHasMore
);

// Performance selectors
export const selectPerformance = createSelector(
  selectProfileState,
  (state) => state.performance
);

export const selectPerformanceLoading = createSelector(
  selectProfileState,
  (state) => state.performanceLoading
);

export const selectPerformanceError = createSelector(
  selectProfileState,
  (state) => state.performanceError
);
