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
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
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
