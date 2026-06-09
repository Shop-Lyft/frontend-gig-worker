import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, tap, withLatestFrom } from 'rxjs/operators';

import { GIG_WORKER_SERVICE } from '../../core/services/gig-worker.service';
import * as AuthActions from './auth.actions';
import { selectLockoutUntil } from './auth.selectors';

export const loginEffect = createEffect(
  (
    actions$ = inject(Actions),
    store = inject(Store),
    gigWorkerService = inject(GIG_WORKER_SERVICE),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.login),
      withLatestFrom(store.select(selectLockoutUntil)),
      exhaustMap(([action, lockoutUntil]) => {
        // Check lockout before calling API
        if (lockoutUntil && lockoutUntil > Date.now()) {
          return of(AuthActions.loginFailure({
            error: 'Too many login attempts. Please wait before trying again.',
          }));
        }

        return gigWorkerService.login(action.email, action.password).pipe(
          map((result) => AuthActions.loginSuccess({ token: result.token, worker: result.worker })),
          catchError((error) =>
            of(AuthActions.loginFailure({
              error: error?.message || 'The email or password is incorrect.',
            })),
          ),
        );
      }),
    );
  },
  { functional: true },
);

export const registerEffect = createEffect(
  (
    actions$ = inject(Actions),
    gigWorkerService = inject(GIG_WORKER_SERVICE),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.register),
      exhaustMap((action) =>
        gigWorkerService.register(action.data).pipe(
          map((result) => AuthActions.registerSuccess({ token: result.token, worker: result.worker })),
          catchError((error) =>
            of(AuthActions.registerFailure({
              error: error?.message || 'Registration could not be completed. Please try again.',
            })),
          ),
        ),
      ),
    );
  },
  { functional: true },
);

export const logoutEffect = createEffect(
  (
    actions$ = inject(Actions),
    gigWorkerService = inject(GIG_WORKER_SERVICE),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        gigWorkerService.logout().pipe(
          map(() => {
            localStorage.removeItem('gig_auth_token');
            return AuthActions.logoutSuccess();
          }),
          catchError(() => {
            localStorage.removeItem('gig_auth_token');
            return of(AuthActions.logoutSuccess());
          }),
        ),
      ),
    );
  },
  { functional: true },
);

export const loginSuccessEffect = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.loginSuccess),
      tap(({ token }) => {
        localStorage.setItem('gig_auth_token', token);
        router.navigate(['/jobs']);
      }),
    );
  },
  { functional: true, dispatch: false },
);

export const registerSuccessEffect = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.registerSuccess),
      tap(({ token }) => {
        localStorage.setItem('gig_auth_token', token);
        // Clear the push prompted flag so the push prompt shows on first login after registration
        localStorage.removeItem('gig_push_prompted');
        router.navigate(['/jobs']);
      }),
    );
  },
  { functional: true, dispatch: false },
);

export const logoutSuccessEffect = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.logoutSuccess),
      tap(() => {
        router.navigate(['/auth/login']);
      }),
    );
  },
  { functional: true, dispatch: false },
);

export const tokenExpiredEffect = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
  ) => {
    return actions$.pipe(
      ofType(AuthActions.tokenExpired),
      tap(() => {
        localStorage.removeItem('gig_auth_token');
        router.navigate(['/auth/login']);
      }),
    );
  },
  { functional: true, dispatch: false },
);
