import { inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';

import * as AuthActions from './auth/auth.actions';
import { clearJobsState } from './jobs/jobs.actions';
import { clearActiveJobState } from './active-job/active-job.actions';
import { clearEarningsState } from './earnings/earnings.actions';
import { clearProfileState } from './profile/profile.actions';

/**
 * App-level effect that clears all feature store states on logout.
 * This ensures no stale user data persists across sessions.
 *
 * Listens for both logoutSuccess and tokenExpired to cover all session-end scenarios.
 */
export const clearAllStatesOnLogout = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(AuthActions.logoutSuccess, AuthActions.tokenExpired),
      mergeMap(() =>
        of(
          clearJobsState(),
          clearActiveJobState(),
          clearEarningsState(),
          clearProfileState()
        )
      )
    );
  },
  { functional: true }
);
