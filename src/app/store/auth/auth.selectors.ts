import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AUTH_FEATURE_KEY, AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(AUTH_FEATURE_KEY);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state) => state.isAuthenticated,
);

export const selectWorker = createSelector(
  selectAuthState,
  (state) => state.worker,
);

export const selectToken = createSelector(
  selectAuthState,
  (state) => state.token,
);

export const selectLoginLoading = createSelector(
  selectAuthState,
  (state) => state.loginLoading,
);

export const selectLoginError = createSelector(
  selectAuthState,
  (state) => state.loginError,
);

export const selectLockoutUntil = createSelector(
  selectAuthState,
  (state) => state.lockoutUntil,
);

export const selectIsLockedOut = createSelector(
  selectAuthState,
  (state) => state.lockoutUntil !== null && state.lockoutUntil > Date.now(),
);

export const selectLoginAttempts = createSelector(
  selectAuthState,
  (state) => state.loginAttempts,
);
