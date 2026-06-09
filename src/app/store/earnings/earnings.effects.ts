import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

import * as EarningsActions from './earnings.actions';
import { GIG_WORKER_SERVICE, GigWorkerService } from '../../core/services/gig-worker.service';

@Injectable()
export class EarningsEffects {
  loadEarnings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EarningsActions.loadEarnings, EarningsActions.loadEarningsBackground),
      switchMap(() =>
        this.gigWorkerService.getEarnings().pipe(
          map((data) =>
            EarningsActions.loadEarningsSuccess({ data, fetchedAt: Date.now() })
          ),
          catchError((error) =>
            of(
              EarningsActions.loadEarningsFailure({
                error: error?.message || 'Failed to load earnings data',
              })
            )
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    @Inject(GIG_WORKER_SERVICE) private gigWorkerService: GigWorkerService
  ) {}
}
