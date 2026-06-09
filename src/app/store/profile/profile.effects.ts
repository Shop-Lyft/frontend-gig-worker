import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom } from 'rxjs/operators';

import * as ProfileActions from './profile.actions';
import { selectHistoryPage } from './profile.selectors';
import { GIG_WORKER_SERVICE, GigWorkerService } from '../../core/services/gig-worker.service';

const HISTORY_PAGE_SIZE = 20;

@Injectable()
export class ProfileEffects {
  loadProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProfileActions.loadProfile, ProfileActions.loadProfileBackground),
      switchMap(() =>
        this.gigWorkerService.getProfile().pipe(
          map((data) =>
            ProfileActions.loadProfileSuccess({ data, fetchedAt: Date.now() })
          ),
          catchError((error) =>
            of(
              ProfileActions.loadProfileFailure({
                error: error?.message || 'Failed to load profile',
              })
            )
          )
        )
      )
    )
  );

  updateProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProfileActions.updateProfile),
      switchMap(({ data }) =>
        this.gigWorkerService.updateProfile(data).pipe(
          map((updatedProfile) =>
            ProfileActions.updateProfileSuccess({ data: updatedProfile })
          ),
          catchError((error) =>
            of(
              ProfileActions.updateProfileFailure({
                error: error?.message || 'Failed to update profile',
              })
            )
          )
        )
      )
    )
  );

  loadHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProfileActions.loadHistory),
      switchMap(() =>
        this.gigWorkerService.getJobHistory(1, HISTORY_PAGE_SIZE).pipe(
          map((result) =>
            ProfileActions.loadHistorySuccess({
              items: result.items,
              hasMore: result.hasMore,
            })
          ),
          catchError((error) =>
            of(
              ProfileActions.loadHistoryFailure({
                error: error?.message || 'Failed to load job history',
              })
            )
          )
        )
      )
    )
  );

  loadMoreHistory$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProfileActions.loadMoreHistory),
      withLatestFrom(this.store.select(selectHistoryPage)),
      switchMap(([, currentPage]) =>
        this.gigWorkerService.getJobHistory(currentPage + 1, HISTORY_PAGE_SIZE).pipe(
          map((result) =>
            ProfileActions.loadMoreHistorySuccess({
              items: result.items,
              hasMore: result.hasMore,
            })
          ),
          catchError((error) =>
            of(
              ProfileActions.loadMoreHistoryFailure({
                error: error?.message || 'Failed to load more history',
              })
            )
          )
        )
      )
    )
  );

  loadPerformance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ProfileActions.loadPerformance),
      switchMap(() =>
        this.gigWorkerService.getPerformance().pipe(
          map((data) => ProfileActions.loadPerformanceSuccess({ data })),
          catchError((error) =>
            of(
              ProfileActions.loadPerformanceFailure({
                error: error?.message || 'Failed to load performance data',
              })
            )
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    @Inject(GIG_WORKER_SERVICE) private gigWorkerService: GigWorkerService
  ) {}
}
