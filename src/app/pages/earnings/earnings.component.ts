import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { EarningsData, DailySettlement } from '../../core/models/earnings.model';
import {
  SkeletonLoaderComponent,
  ErrorRetryComponent,
} from '../../shared/components';
import { ZarCurrencyPipe } from '../../shared/pipes/currency.pipe';
import * as EarningsActions from '../../store/earnings/earnings.actions';
import {
  selectEarningsData,
  selectEarningsLoading,
  selectEarningsError,
  selectWeeklyEarnings,
  selectMonthlyEarnings,
  selectJobsCompletedThisWeek,
  selectWorkerRating,
  selectRecentSettlements,
  selectBankAccountRefMasked,
} from '../../store/earnings/earnings.selectors';

/**
 * EarningsPageComponent — Earnings Dashboard screen.
 *
 * Displays:
 * - 4 summary metric cards: weekly earnings, jobs completed, rating, monthly earnings
 * - 7-day settlement list with day labels (Today, Yesterday, weekday names)
 * - Settlement info text with masked bank reference
 * - Skeleton loading state for cards and list
 * - Error retry component on failure
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9
 */
@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [
    CommonModule,
    SkeletonLoaderComponent,
    ErrorRetryComponent,
    ZarCurrencyPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.scss',
})
export class EarningsComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();

  /** Observable streams from store */
  earningsData$!: Observable<EarningsData | null>;
  loading$!: Observable<boolean>;
  error$!: Observable<{ message: string; timestamp: number } | null>;

  /** Local component state synced from observables */
  weeklyEarnings = 0;
  monthlyEarnings = 0;
  jobsCompleted = 0;
  workerRating = 0;
  settlements: DailySettlement[] = [];
  bankAccountRefMasked = '';
  errorMessage: string | null = null;

  /** Skeleton placeholder arrays */
  readonly skeletonCards = [1, 2, 3, 4];
  readonly skeletonSettlements = [1, 2, 3, 4, 5, 6, 7];

  ngOnInit(): void {
    // Dispatch load action
    this.store.dispatch(EarningsActions.loadEarnings());

    // Wire store selectors
    this.earningsData$ = this.store.select(selectEarningsData);
    this.loading$ = this.store.select(selectEarningsLoading);
    this.error$ = this.store.select(selectEarningsError);

    // Sync individual values from store
    this.store
      .select(selectWeeklyEarnings)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.weeklyEarnings = value));

    this.store
      .select(selectMonthlyEarnings)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.monthlyEarnings = value));

    this.store
      .select(selectJobsCompletedThisWeek)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.jobsCompleted = value));

    this.store
      .select(selectWorkerRating)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.workerRating = value));

    this.store
      .select(selectRecentSettlements)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.settlements = value));

    this.store
      .select(selectBankAccountRefMasked)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value) => (this.bankAccountRefMasked = value));

    // Sync error message
    this.error$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.errorMessage = error?.message ?? null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle retry button click — re-dispatches loadEarnings action.
   */
  onRetry(): void {
    this.store.dispatch(EarningsActions.loadEarnings());
  }
}
