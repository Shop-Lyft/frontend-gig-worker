import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';

import { GIG_WORKER_SERVICE } from '../../core/services/gig-worker.service';
import { isCacheStale } from '../../core/utils/staleness.utils';
import * as JobsActions from './jobs.actions';
import { selectActiveFilter, selectLastFetchedAt } from './jobs.selectors';

export const loadJobsEffect = createEffect(
  (
    actions$ = inject(Actions),
    store = inject(Store),
    gigService = inject(GIG_WORKER_SERVICE),
  ) => {
    return actions$.pipe(
      ofType(JobsActions.loadJobs, JobsActions.loadJobsBackground),
      withLatestFrom(store.select(selectActiveFilter)),
      switchMap(([_, filter]) =>
        gigService.getAvailableJobs(filter).pipe(
          map((jobs) => JobsActions.loadJobsSuccess({ jobs })),
          catchError((error) =>
            of(
              JobsActions.loadJobsFailure({
                error: error?.message ?? 'Failed to load jobs',
              })
            )
          )
        )
      )
    );
  },
  { functional: true }
);

export const acceptJobEffect = createEffect(
  (
    actions$ = inject(Actions),
    gigService = inject(GIG_WORKER_SERVICE),
  ) => {
    return actions$.pipe(
      ofType(JobsActions.acceptJob),
      exhaustMap(({ jobId }) =>
        gigService.acceptJob(jobId).pipe(
          map((job) => JobsActions.acceptJobSuccess({ job })),
          catchError((error) => {
            const message =
              error?.status === 409
                ? 'Job no longer available'
                : error?.message ?? 'Failed to accept job';
            return of(JobsActions.acceptJobFailure({ error: message }));
          })
        )
      )
    );
  },
  { functional: true }
);

export const acceptJobSuccessNavigateEffect = createEffect(
  (
    actions$ = inject(Actions),
    router = inject(Router),
    store = inject(Store),
  ) => {
    return actions$.pipe(
      ofType(JobsActions.acceptJobSuccess),
      tap(({ job }) => {
        // Immediately set the active job in the active-job store so the
        // picklist page doesn't have to re-fetch and risk a race condition
        store.dispatch({ type: '[Active Job] Load Active Job Success', job });
        router.navigate(['/active']);
      })
    );
  },
  { functional: true, dispatch: false }
);

export const reloadOnFilterChangeEffect = createEffect(
  (actions$ = inject(Actions)) => {
    return actions$.pipe(
      ofType(JobsActions.setFilter),
      map(() => JobsActions.loadJobs())
    );
  },
  { functional: true }
);

export const handleJobEventsEffect = createEffect(
  (gigService = inject(GIG_WORKER_SERVICE)) => {
    return gigService.subscribeToJobUpdates().pipe(
      map((event) => {
        if (event.type === 'job_available') {
          const payload = event.payload as {
            jobId: string;
            jobType: 'shopper' | 'driver';
            storeName: string;
            storeLatitude: number;
            storeLongitude: number;
            itemCount: number;
            estimatedPay: number;
          };
          const job = {
            id: payload.jobId,
            orderId: '',
            storeId: '',
            jobType: payload.jobType,
            status: 'pending',
            storeName: payload.storeName,
            storeLatitude: payload.storeLatitude,
            storeLongitude: payload.storeLongitude,
            itemCount: payload.itemCount,
            estimatedPay: payload.estimatedPay,
            createdAt: new Date().toISOString(),
          };
          return JobsActions.jobAvailable({ job });
        } else {
          const payload = event.payload as { jobId: string };
          return JobsActions.jobTaken({ jobId: payload.jobId });
        }
      })
    );
  },
  { functional: true }
);
