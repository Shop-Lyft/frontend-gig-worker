import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  inject,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { JobHistoryItem } from '../../../core/models/job.model';
import { SkeletonLoaderComponent } from '../../../shared/components';
import { ZarCurrencyPipe } from '../../../shared/pipes/currency.pipe';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import * as ProfileActions from '../../../store/profile/profile.actions';
import {
  selectHistory,
  selectHistoryLoading,
  selectHistoryError,
  selectHistoryHasMore,
} from '../../../store/profile/profile.selectors';

/**
 * HistoryComponent — Job History page.
 *
 * Displays a paginated list of completed jobs (20 per page) with infinite scroll.
 * Each entry shows: order number, job type badge, store name, completion date
 * (DD MMM YYYY), and earned amount (R prefix, 2 decimals).
 *
 * Features:
 * - Infinite scroll: loads next page when scrolling to bottom
 * - 5 skeleton rows on initial load
 * - Loading indicator at bottom during pagination
 * - Empty state: "No job history available"
 * - End-of-list indicator: "You've reached the end"
 * - Inline error with retry for failed pagination
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, SkeletonLoaderComponent, ZarCurrencyPipe, RelativeTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="history-page" #scrollContainer (scroll)="onScroll($event)">
      <header class="history-header">
        <h1 class="history-title">Job History</h1>
      </header>

      <!-- Initial Loading State: 5 skeleton rows -->
      @if (isInitialLoading && history.length === 0) {
        <div class="skeleton-list" aria-busy="true" aria-label="Loading job history">
          @for (i of skeletonItems; track i) {
            <app-skeleton-loader [lines]="3" [showAvatar]="true"></app-skeleton-loader>
          }
        </div>
      } @else if (!isInitialLoading && history.length === 0 && !errorMessage) {
        <!-- Empty State -->
        <div class="empty-state" role="status">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 class="empty-title">No job history available</h2>
          <p class="empty-message">Your completed jobs will appear here</p>
        </div>
      } @else if (!isInitialLoading && history.length === 0 && errorMessage) {
        <!-- Error State (initial load failed) -->
        <div class="error-state" role="alert">
          <div class="error-content">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p class="error-message">{{ errorMessage }}</p>
          </div>
          <button
            class="retry-btn"
            (click)="onRetry()"
            aria-label="Retry loading job history"
          >
            Retry
          </button>
        </div>
      } @else if (history.length > 0) {
        <!-- History List -->
        <div class="history-list" role="list">
          @for (item of history; track item.id) {
            <div class="history-item" role="listitem">
              <div class="item-header">
                <span class="order-number">#{{ item.orderNumber }}</span>
                <span class="job-type-badge" [class]="'badge-' + item.jobType">
                  {{ item.jobType === 'shopper' ? 'Shopper' : 'Driver' }}
                </span>
              </div>
              <div class="item-body">
                <span class="store-name">{{ item.storeName }}</span>
                <span class="completion-date">{{ formatDate(item.completedAt) }}</span>
              </div>
              <div class="item-footer">
                <span class="earned-amount">{{ item.earnedAmount | zarCurrency }}</span>
              </div>
            </div>
          }
        </div>

        <!-- Pagination Loading Indicator -->
        @if (isPaginationLoading) {
          <div class="pagination-loading" aria-busy="true" aria-label="Loading more jobs">
            <div class="loading-spinner"></div>
            <span class="loading-text">Loading more...</span>
          </div>
        }

        <!-- Pagination Error with Retry -->
        @if (paginationError) {
          <div class="pagination-error" role="alert">
            <p class="pagination-error-text">{{ paginationError }}</p>
            <button
              class="retry-btn retry-btn-small"
              (click)="onRetryPagination()"
              aria-label="Retry loading more jobs"
            >
              Retry
            </button>
          </div>
        }

        <!-- End-of-List Indicator -->
        @if (!hasMore && !isPaginationLoading && !paginationError) {
          <div class="end-of-list" role="status">
            <div class="end-divider"></div>
            <span class="end-text">You've reached the end</span>
            <div class="end-divider"></div>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .history-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      max-height: 100vh;
      overflow-y: auto;
      padding: 16px;
      gap: 16px;
    }

    /* Header */
    .history-header {
      margin-bottom: 8px;
    }

    .history-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }

    /* Skeleton list */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
      margin-bottom: 16px;
    }

    .empty-icon svg {
      width: 32px;
      height: 32px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px;
    }

    .empty-message {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    /* Error State */
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 24px 16px;
      text-align: center;
    }

    .error-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .error-icon {
      width: 32px;
      height: 32px;
      color: #ef4444;
    }

    .error-message {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
      line-height: 1.5;
    }

    /* History List */
    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-item {
      background: #1e293b;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .order-number {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }

    .job-type-badge {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .badge-shopper {
      background: rgba(99, 102, 241, 0.15);
      color: #818cf8;
    }

    .badge-driver {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .item-body {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .store-name {
      font-size: 14px;
      color: #ffffff;
      font-weight: 500;
    }

    .completion-date {
      font-size: 12px;
      color: #94a3b8;
    }

    .item-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
    }

    .earned-amount {
      font-size: 16px;
      font-weight: 700;
      color: #10b981;
    }

    /* Pagination Loading */
    .pagination-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 16px;
    }

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(148, 163, 184, 0.3);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    .loading-text {
      font-size: 13px;
      color: #94a3b8;
    }

    /* Pagination Error */
    .pagination-error {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.08);
      border-radius: 8px;
    }

    .pagination-error-text {
      font-size: 13px;
      color: #ef4444;
      margin: 0;
    }

    /* Retry Button */
    .retry-btn {
      min-width: 100px;
      min-height: 44px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      background: #10b981;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    .retry-btn:active {
      opacity: 0.8;
    }

    .retry-btn-small {
      min-width: 80px;
      min-height: 36px;
      padding: 8px 16px;
      font-size: 13px;
    }

    /* End-of-List Indicator */
    .end-of-list {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 16px;
    }

    .end-divider {
      flex: 1;
      height: 1px;
      background: #334155;
    }

    .end-text {
      font-size: 12px;
      color: #64748b;
      white-space: nowrap;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class HistoryComponent implements OnInit, OnDestroy, AfterViewInit {
  private readonly store = inject(Store);
  private readonly destroy$ = new Subject<void>();

  @ViewChild('scrollContainer', { static: false }) scrollContainer!: ElementRef<HTMLElement>;

  /** Local state synced from store */
  history: JobHistoryItem[] = [];
  isInitialLoading = true;
  isPaginationLoading = false;
  errorMessage: string | null = null;
  paginationError: string | null = null;
  hasMore = true;

  /** Month abbreviations for date formatting */
  private static readonly MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /** Skeleton placeholder count (5 rows) */
  readonly skeletonItems = [1, 2, 3, 4, 5];

  /** Scroll threshold in pixels from bottom to trigger next page */
  private readonly SCROLL_THRESHOLD = 100;

  ngOnInit(): void {
    // Dispatch initial load
    this.store.dispatch(ProfileActions.loadHistory());

    // Subscribe to history items
    this.store
      .select(selectHistory)
      .pipe(takeUntil(this.destroy$))
      .subscribe((items) => {
        this.history = items;
      });

    // Subscribe to loading state
    this.store
      .select(selectHistoryLoading)
      .pipe(takeUntil(this.destroy$))
      .subscribe((loading) => {
        if (this.history.length === 0) {
          this.isInitialLoading = loading;
          this.isPaginationLoading = false;
        } else {
          this.isInitialLoading = false;
          this.isPaginationLoading = loading;
        }
      });

    // Subscribe to error state
    this.store
      .select(selectHistoryError)
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        if (this.history.length === 0) {
          this.errorMessage = error;
          this.paginationError = null;
        } else {
          this.errorMessage = null;
          this.paginationError = error;
        }
      });

    // Subscribe to hasMore
    this.store
      .select(selectHistoryHasMore)
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasMore) => {
        this.hasMore = hasMore;
      });
  }

  ngAfterViewInit(): void {
    // Infinite scroll is handled via the (scroll) event on the container
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Handle scroll events for infinite scroll pagination.
   * When user scrolls within SCROLL_THRESHOLD of the bottom,
   * dispatch loadMoreHistory if hasMore is true and not already loading.
   */
  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (
      scrollBottom <= this.SCROLL_THRESHOLD &&
      this.hasMore &&
      !this.isPaginationLoading &&
      !this.paginationError
    ) {
      this.store.dispatch(ProfileActions.loadMoreHistory());
    }
  }

  /**
   * Retry initial load after failure.
   */
  onRetry(): void {
    this.store.dispatch(ProfileActions.loadHistory());
  }

  /**
   * Retry pagination load after failure (preserves existing results).
   */
  onRetryPagination(): void {
    this.paginationError = null;
    this.store.dispatch(ProfileActions.loadMoreHistory());
  }

  /**
   * Format a date string as "DD MMM YYYY".
   * Example: "2024-03-15T10:30:00Z" → "15 Mar 2024"
   */
  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return '';
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = HistoryComponent.MONTHS[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  }
}
