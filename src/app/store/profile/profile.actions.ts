import { createAction, props } from '@ngrx/store';
import { WorkerProfile, ProfileUpdate } from '../../core/models/worker.model';
import { JobHistoryItem } from '../../core/models/job.model';
import { PerformanceData } from '../../core/models/earnings.model';

// Load Profile
export const loadProfile = createAction('[Profile] Load Profile');
export const loadProfileBackground = createAction('[Profile] Load Profile Background');

export const loadProfileSuccess = createAction(
  '[Profile] Load Profile Success',
  props<{ data: WorkerProfile; fetchedAt: number }>()
);

export const loadProfileFailure = createAction(
  '[Profile] Load Profile Failure',
  props<{ error: string }>()
);

// Update Profile
export const updateProfile = createAction(
  '[Profile] Update Profile',
  props<{ data: ProfileUpdate }>()
);

export const updateProfileSuccess = createAction(
  '[Profile] Update Profile Success',
  props<{ data: WorkerProfile }>()
);

export const updateProfileFailure = createAction(
  '[Profile] Update Profile Failure',
  props<{ error: string }>()
);

// Load History (initial page)
export const loadHistory = createAction('[Profile] Load History');

export const loadHistorySuccess = createAction(
  '[Profile] Load History Success',
  props<{ items: JobHistoryItem[]; hasMore: boolean }>()
);

export const loadHistoryFailure = createAction(
  '[Profile] Load History Failure',
  props<{ error: string }>()
);

// Load More History (next page — infinite scroll)
export const loadMoreHistory = createAction('[Profile] Load More History');

export const loadMoreHistorySuccess = createAction(
  '[Profile] Load More History Success',
  props<{ items: JobHistoryItem[]; hasMore: boolean }>()
);

export const loadMoreHistoryFailure = createAction(
  '[Profile] Load More History Failure',
  props<{ error: string }>()
);

// Load Performance
export const loadPerformance = createAction('[Profile] Load Performance');

export const loadPerformanceSuccess = createAction(
  '[Profile] Load Performance Success',
  props<{ data: PerformanceData }>()
);

export const loadPerformanceFailure = createAction(
  '[Profile] Load Performance Failure',
  props<{ error: string }>()
);

// Clear state (e.g., on logout)
export const clearProfileState = createAction('[Profile] Clear State');
