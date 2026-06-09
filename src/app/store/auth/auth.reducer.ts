import { createReducer, on } from '@ngrx/store';
import { WorkerProfile } from '../../core/models/worker.model';
import * as AuthActions from './auth.actions';

export interface AuthState {
  worker: WorkerProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loginLoading: boolean;
  loginError: string | null;
  loginAttempts: number;
  lockoutUntil: number | null; // Unix ms
}

export const initialState: AuthState = {
  worker: null,
  token: null,
  isAuthenticated: false,
  loginLoading: false,
  loginError: null,
  loginAttempts: 0,
  lockoutUntil: null,
};

export const AUTH_FEATURE_KEY = 'auth';

export const authReducer = createReducer(
  initialState,

  // Login
  on(AuthActions.login, (state): AuthState => ({
    ...state,
    loginLoading: true,
    loginError: null,
  })),

  on(AuthActions.loginSuccess, (state, { token, worker }): AuthState => ({
    ...state,
    worker,
    token,
    isAuthenticated: true,
    loginLoading: false,
    loginError: null,
    loginAttempts: 0,
    lockoutUntil: null,
  })),

  on(AuthActions.loginFailure, (state, { error }): AuthState => {
    const newAttempts = state.loginAttempts + 1;
    const lockoutUntil = newAttempts >= 5 ? Date.now() + 60000 : state.lockoutUntil;

    return {
      ...state,
      loginLoading: false,
      loginError: error,
      loginAttempts: newAttempts,
      lockoutUntil,
    };
  }),

  // Register
  on(AuthActions.register, (state): AuthState => ({
    ...state,
    loginLoading: true,
    loginError: null,
  })),

  on(AuthActions.registerSuccess, (state, { token, worker }): AuthState => ({
    ...state,
    worker,
    token,
    isAuthenticated: true,
    loginLoading: false,
    loginError: null,
    loginAttempts: 0,
    lockoutUntil: null,
  })),

  on(AuthActions.registerFailure, (state, { error }): AuthState => ({
    ...state,
    loginLoading: false,
    loginError: error,
  })),

  // Logout
  on(AuthActions.logout, (state): AuthState => ({
    ...state,
    loginLoading: true,
  })),

  on(AuthActions.logoutSuccess, (): AuthState => ({
    ...initialState,
  })),

  // Token Expiry
  on(AuthActions.tokenExpired, (): AuthState => ({
    ...initialState,
  })),

  // Clear Error
  on(AuthActions.clearError, (state): AuthState => ({
    ...state,
    loginError: null,
  })),

  // Restore Session (page refresh)
  on(AuthActions.restoreSession, (state, { token, worker }): AuthState => ({
    ...state,
    worker,
    token,
    isAuthenticated: true,
    loginLoading: false,
    loginError: null,
    loginAttempts: 0,
    lockoutUntil: null,
  })),
);
