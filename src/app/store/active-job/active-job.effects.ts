import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, of, switchMap } from 'rxjs';
import { GIG_WORKER_SERVICE, GigWorkerService } from '../../core/services/gig-worker.service';
import * as ActiveJobActions from './active-job.actions';

@Injectable()
export class ActiveJobEffects {
  private actions$ = inject(Actions);
  private gigService = inject(GIG_WORKER_SERVICE) as GigWorkerService;

  loadActiveJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.loadActiveJob, ActiveJobActions.loadActiveJobBackground),
      switchMap(() =>
        this.gigService.getActiveJob().pipe(
          map((job) => ActiveJobActions.loadActiveJobSuccess({ job })),
          catchError((error) =>
            of(ActiveJobActions.loadActiveJobFailure({ error: error?.message || 'Failed to load active job' }))
          )
        )
      )
    )
  );

  loadPicklist$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.loadPicklist),
      switchMap(({ orderId }) =>
        this.gigService.getPicklist(orderId).pipe(
          map((items) => ActiveJobActions.loadPicklistSuccess({ items })),
          catchError((error) =>
            of(ActiveJobActions.loadPicklistFailure({ error: error?.message || 'Failed to load picklist' }))
          )
        )
      )
    )
  );

  updatePickItem$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.updatePickItem),
      mergeMap(({ orderId, itemId, status }) =>
        this.gigService.updatePickItemStatus(orderId, itemId, status).pipe(
          map(() => ActiveJobActions.updatePickItemSuccess({ itemId, status })),
          catchError((error) =>
            of(ActiveJobActions.updatePickItemFailure({ error: error?.message || 'Failed to update pick item' }))
          )
        )
      )
    )
  );

  markAllPicked$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.markAllPicked),
      switchMap(({ jobId }) =>
        this.gigService.markAllPicked(jobId).pipe(
          map(() => ActiveJobActions.markAllPickedSuccess()),
          catchError((error) =>
            of(ActiveJobActions.markAllPickedFailure({ error: error?.message || 'Failed to mark all picked' }))
          )
        )
      )
    )
  );

  completeDelivery$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.completeDelivery),
      switchMap(({ orderId }) =>
        this.gigService.completeDelivery(orderId).pipe(
          map(() => ActiveJobActions.completeDeliverySuccess()),
          catchError((error) =>
            of(ActiveJobActions.completeDeliveryFailure({ error: error?.message || 'Failed to complete delivery' }))
          )
        )
      )
    )
  );

  cancelActiveJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.cancelActiveJob),
      switchMap(({ jobId }) =>
        this.gigService.cancelActiveJob(jobId).pipe(
          map(() => ActiveJobActions.cancelActiveJobSuccess()),
          catchError((error) =>
            of(ActiveJobActions.cancelActiveJobFailure({ error: error?.message || 'Failed to cancel job' }))
          )
        )
      )
    )
  );

  proposeSubstitution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.proposeSubstitution),
      mergeMap(({ orderId, itemId, proposal }) =>
        this.gigService.proposeSubstitution(orderId, itemId, proposal).pipe(
          map(() => ActiveJobActions.proposeSubstitutionSuccess({ itemId })),
          catchError((error) =>
            of(ActiveJobActions.proposeSubstitutionFailure({ error: error?.message || 'Failed to propose substitution' }))
          )
        )
      )
    )
  );

  cancelSubstitution$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.cancelSubstitution),
      mergeMap(({ orderId, itemId }) =>
        this.gigService.cancelSubstitution(orderId, itemId).pipe(
          map(() => ActiveJobActions.cancelSubstitutionSuccess({ itemId })),
          catchError((error) =>
            of(ActiveJobActions.cancelSubstitutionFailure({ error: error?.message || 'Failed to cancel substitution' }))
          )
        )
      )
    )
  );

  listenToSubstitutionResponses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ActiveJobActions.loadActiveJobSuccess),
      switchMap(({ job }) => {
        if (!job) {
          return of();
        }
        return this.gigService.subscribeToSubstitutionResponses().pipe(
          map((response) => ActiveJobActions.substitutionResponse({ response }))
        );
      })
    )
  );
}
