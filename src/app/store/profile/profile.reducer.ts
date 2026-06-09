import { createReducer, on } from '@ngrx/store';
import { WorkerProfile } from '../../core/models/worker.model';
import { JobHistoryItem } from '../../core/models/job.model';
import { PerformanceData } from '../../core/models/earnings.model';
import * as ProfileActions from './profile.actions';

export interface ProfileState {
  data: WorkerProfile | null;
  loading: boolean;
  error: { message: string; timestamp: number } | null;
  lastFetchedAt: number | null;
  updateLoading: boolean;
  updateError: string | null;
  // History
  history: JobHistoryItem[];
  historyLoading: boolean;
  historyError: string | null;
  historyPage: number;
  historyHasMore: boolean;
  // Performance
  performance: PerformanceData | null;
  performanceLoading: boolean;
  performanceError: string | null;
}

export const initialProfileState: ProfileState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
  updateLoading: false,
  updateError: null,
  // History
  history: [],
  historyLoading: false,
  historyError: null,
  historyPage: 1,
  historyHasMore: true,
  // Performance
  performance: null,
  performanceLoading: false,
  performanceError: null,
};

export const profileReducer = createReducer(
  initialProfileState,

  // Load Profile
  on(ProfileActions.loadProfile, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  // Background load (stale-while-revalidate: show cached data, no spinner)
  on(ProfileActions.loadProfileBackground, (state) => ({
    ...state,
    error: null,
  })),

  on(ProfileActions.loadProfileSuccess, (state, { data, fetchedAt }) => ({
    ...state,
    data,
    loading: false,
    error: null,
    lastFetchedAt: fetchedAt,
  })),

  on(ProfileActions.loadProfileFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: { message: error, timestamp: Date.now() },
  })),

  // Update Profile
  on(ProfileActions.updateProfile, (state) => ({
    ...state,
    updateLoading: true,
    updateError: null,
  })),

  on(ProfileActions.updateProfileSuccess, (state, { data }) => ({
    ...state,
    data,
    updateLoading: false,
    updateError: null,
  })),

  on(ProfileActions.updateProfileFailure, (state, { error }) => ({
    ...state,
    updateLoading: false,
    updateError: error,
  })),

  // Load History (initial page)
  on(ProfileActions.loadHistory, (state) => ({
    ...state,
    history: [],
    historyLoading: true,
    historyError: null,
    historyPage: 1,
    historyHasMore: true,
  })),

  on(ProfileActions.loadHistorySuccess, (state, { items, hasMore }) => ({
    ...state,
    history: items,
    historyLoading: false,
    historyError: null,
    historyPage: 1,
    historyHasMore: hasMore,
  })),

  on(ProfileActions.loadHistoryFailure, (state, { error }) => ({
    ...state,
    historyLoading: false,
    historyError: error,
  })),

  // Load More History (next page)
  on(ProfileActions.loadMoreHistory, (state) => ({
    ...state,
    historyLoading: true,
    historyError: null,
  })),

  on(ProfileActions.loadMoreHistorySuccess, (state, { items, hasMore }) => ({
    ...state,
    history: [...state.history, ...items],
    historyLoading: false,
    historyError: null,
    historyPage: state.historyPage + 1,
    historyHasMore: hasMore,
  })),

  on(ProfileActions.loadMoreHistoryFailure, (state, { error }) => ({
    ...state,
    historyLoading: false,
    historyError: error,
  })),

  // Load Performance
  on(ProfileActions.loadPerformance, (state) => ({
    ...state,
    performanceLoading: true,
    performanceError: null,
  })),

  on(ProfileActions.loadPerformanceSuccess, (state, { data }) => ({
    ...state,
    performance: data,
    performanceLoading: false,
    performanceError: null,
  })),

  on(ProfileActions.loadPerformanceFailure, (state, { error }) => ({
    ...state,
    performanceLoading: false,
    performanceError: error,
  })),

  // Clear State
  on(ProfileActions.clearProfileState, () => ({
    ...initialProfileState,
  }))
);
