import { createAction, props } from '@ngrx/store';
import { RegistrationData, WorkerProfile } from '../../core/models/worker.model';

// Login
export const login = createAction(
  '[Auth] Login',
  props<{ email: string; password: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ token: string; worker: WorkerProfile }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

// Register
export const register = createAction(
  '[Auth] Register',
  props<{ data: RegistrationData }>()
);

export const registerSuccess = createAction(
  '[Auth] Register Success',
  props<{ token: string; worker: WorkerProfile }>()
);

export const registerFailure = createAction(
  '[Auth] Register Failure',
  props<{ error: string }>()
);

// Logout
export const logout = createAction('[Auth] Logout');

export const logoutSuccess = createAction('[Auth] Logout Success');

// Token Expiry
export const tokenExpired = createAction('[Auth] Token Expired');

// Clear Error
export const clearError = createAction('[Auth] Clear Error');

// Session Restore (on page refresh)
export const restoreSession = createAction(
  '[Auth] Restore Session',
  props<{ token: string; worker: WorkerProfile }>()
);
