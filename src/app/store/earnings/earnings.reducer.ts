import { createReducer, on } from '@ngrx/store';
import { EarningsData } from '../../core/models/earnings.model';
import * as EarningsActions from './earnings.actions';

export interface EarningsState {
  data: EarningsData | null;
  loading: boolean;
  error: { message: string; timestamp: number } | null;
  lastFetchedAt: number | null;
}

export const initialEarningsState: EarningsState = {
  data: null,
  loading: false,
  error: null,
  lastFetchedAt: null,
};

export const earningsReducer = createReducer(
  initialEarningsState,

  on(EarningsActions.loadEarnings, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  // Background load (stale-while-revalidate: show cached data, no spinner)
  on(EarningsActions.loadEarningsBackground, (state) => ({
    ...state,
    error: null,
  })),

  on(EarningsActions.loadEarningsSuccess, (state, { data, fetchedAt }) => ({
    ...state,
    data,
    loading: false,
    error: null,
    lastFetchedAt: fetchedAt,
  })),

  on(EarningsActions.loadEarningsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error: { message: error, timestamp: Date.now() },
  })),

  on(EarningsActions.clearEarningsState, () => ({
    ...initialEarningsState,
  }))
);
