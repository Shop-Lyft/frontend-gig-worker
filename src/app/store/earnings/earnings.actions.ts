import { createAction, props } from '@ngrx/store';
import { EarningsData } from '../../core/models/earnings.model';

// Load Earnings
export const loadEarnings = createAction('[Earnings] Load Earnings');
export const loadEarningsBackground = createAction('[Earnings] Load Earnings Background');

export const loadEarningsSuccess = createAction(
  '[Earnings] Load Earnings Success',
  props<{ data: EarningsData; fetchedAt: number }>()
);

export const loadEarningsFailure = createAction(
  '[Earnings] Load Earnings Failure',
  props<{ error: string }>()
);

// Clear state (e.g., on logout)
export const clearEarningsState = createAction('[Earnings] Clear State');
