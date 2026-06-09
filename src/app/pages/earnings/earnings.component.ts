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
  template: `
    <div class="earnings-page">
      <h1 class="page-title">Earnings</h1>

      @if ((loading$ | async) === true && (earningsData$ | async) === null) {
        <!-- Skeleton Loading State -->
        <div class="metrics-grid skeleton-metrics">
          @for (i of skeletonCards; track i) {
            <div class="metric-card skeleton-card">
              <div class="skeleton-label"></div>
              <div class="skeleton-value"></div>
            </div>
          }
        </div>
        <div class="settlement-section">
          <div class="skeleton-section-title"></div>
          @for (i of skeletonSettlements; track i) {
            <div class="skeleton-settlement-row">
              <div class="skeleton-day"></div>
              <div class="skeleton-amount"></div>
            </div>
          }
        </div>
      } @else if (errorMessage) {
        <!-- Error State -->
        <app-error-retry
          [message]="errorMessage"
          (retry)="onRetry()"
        ></app-error-retry>
      } @else {
        <!-- Metric Cards -->
        <div class="metrics-grid">
          <!-- Weekly Earnings Card -->
          <div class="metric-card">
            <span class="metric-label">Weekly Earnings</span>
            <span class="metric-value currency">{{ weeklyEarnings | zarCurrency }}</span>
          </div>

          <!-- Jobs Completed Card -->
          <div class="metric-card">
            <span class="metric-label">Jobs Completed</span>
            <span class="metric-value">{{ jobsCompleted }}</span>
          </div>

          <!-- Rating Card -->
          <div class="metric-card">
            <span class="metric-label">Rating</span>
            <span class="metric-value rating">
              <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              {{ workerRating.toFixed(1) }}
            </span>
          </div>

          <!-- Monthly Earnings Card -->
          <div class="metric-card">
            <span class="metric-label">Monthly Earnings</span>
            <span class="metric-value currency">{{ monthlyEarnings | zarCurrency }}</span>
          </div>
        </div>

        <!-- Settlement List -->
        <section class="settlement-section">
          <h2 class="section-title">Recent Settlements</h2>
          <div class="settlement-list" role="list">
            @for (settlement of settlements; track settlement.day) {
              <div class="settlement-row" role="listitem">
                <span class="settlement-day">{{ settlement.day }}</span>
                <span class="settlement-amount">{{ settlement.amount | zarCurrency }}</span>
              </div>
            }
          </div>

          <!-- Settlement Info -->
          @if (bankAccountRefMasked) {
            <p class="settlement-info">
              Settled daily via ****{{ bankAccountRefMasked }}
            </p>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .earnings-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      padding: 16px;
      gap: 20px;
    }

    .page-title {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    /* Metric Cards Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .metric-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: #1e293b;
      border-radius: 12px;
    }

    .metric-label {
      font-size: 12px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .metric-value {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
    }

    .metric-value.currency {
      color: #10b981;
    }

    .metric-value.rating {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #f59e0b;
    }

    .star-icon {
      width: 20px;
      height: 20px;
    }

    /* Settlement Section */
    .settlement-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin: 0;
    }

    .settlement-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      background: #1e293b;
      border-radius: 12px;
      overflow: hidden;
    }

    .settlement-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .settlement-row:last-child {
      border-bottom: none;
    }

    .settlement-day {
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
    }

    .settlement-amount {
      font-size: 14px;
      font-weight: 600;
      color: #10b981;
    }

    .settlement-info {
      font-size: 13px;
      color: #94a3b8;
      margin: 4px 0 0;
      text-align: center;
    }

    /* Skeleton Loading Styles */
    .skeleton-metrics {
      pointer-events: none;
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-label {
      width: 80%;
      height: 12px;
      background: #334155;
      border-radius: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-value {
      width: 60%;
      height: 22px;
      background: #334155;
      border-radius: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-section-title {
      width: 150px;
      height: 16px;
      background: #334155;
      border-radius: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-settlement-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: #1e293b;
      border-radius: 12px;
      margin-bottom: 2px;
    }

    .skeleton-settlement-row:first-of-type {
      border-radius: 12px 12px 0 0;
    }

    .skeleton-settlement-row:last-of-type {
      border-radius: 0 0 12px 12px;
      margin-bottom: 0;
    }

    .skeleton-day {
      width: 70px;
      height: 14px;
      background: #334155;
      border-radius: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .skeleton-amount {
      width: 60px;
      height: 14px;
      background: #334155;
      border-radius: 4px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.4;
      }
    }
  `],
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
