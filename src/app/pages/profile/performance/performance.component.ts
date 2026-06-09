import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';

import { loadPerformance } from '../../../store/profile/profile.actions';
import {
  selectPerformance,
  selectPerformanceLoading,
  selectPerformanceError,
} from '../../../store/profile/profile.selectors';
import { classifyTier, getTierColor, PerformanceTier } from '../../../core/utils/tier.utils';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ErrorRetryComponent } from '../../../shared/components/error-retry/error-retry.component';

/**
 * PerformanceComponent — displays worker performance metrics, tier badge,
 * and recent customer reviews.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 */
@Component({
  selector: 'app-performance',
  standalone: true,
  imports: [
    CommonModule,
    RelativeTimePipe,
    SkeletonLoaderComponent,
    ErrorRetryComponent,
  ],
  template: `
    <div class="performance-page">
      <h1 class="page-title">Performance</h1>

      <!-- Loading state -->
      @if (loading$ | async) {
        <div class="skeleton-section">
          <app-skeleton-loader [lines]="2"></app-skeleton-loader>
          <app-skeleton-loader [lines]="3"></app-skeleton-loader>
          <app-skeleton-loader [lines]="4"></app-skeleton-loader>
        </div>
      } @else if (error$ | async) {
        <!-- Error state -->
        <app-error-retry
          [message]="(error$ | async) ?? 'Failed to load performance data'"
          (retry)="onRetry()"
        ></app-error-retry>
      } @else {
        @if (performance$ | async; as perf) {
          <!-- Metrics Section -->
          <section class="metrics-section" aria-label="Performance metrics">
            <!-- Overall Rating -->
            <div class="metric-card rating-card">
              <div class="rating-display">
                <span class="rating-value">
                  @if (perf.totalRatings === 0) {
                    N/A
                  } @else {
                    {{ perf.overallRating | number:'1.1-1' }}
                  }
                </span>
                <svg class="star-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <span class="metric-label">Overall Rating</span>
            </div>

            <!-- Total Ratings -->
            <div class="metric-card">
              <span class="metric-value">{{ perf.totalRatings }}</span>
              <span class="metric-label">Total Ratings</span>
            </div>

            <!-- Total Jobs Completed -->
            <div class="metric-card">
              <span class="metric-value">{{ perf.totalJobsCompleted }}</span>
              <span class="metric-label">Jobs Completed</span>
            </div>

            <!-- Acceptance Rate -->
            <div class="metric-card">
              <span class="metric-value">{{ perf.acceptanceRate }}%</span>
              <span class="metric-label">Acceptance Rate</span>
            </div>
          </section>

          <!-- Tier Badge -->
          <section class="tier-section" aria-label="Performance tier">
            <div
              class="tier-badge"
              [style.background-color]="getTierBgColor(perf.overallRating)"
              [style.border-color]="getTierBorderColor(perf.overallRating)"
            >
              <span class="tier-label">{{ getTierName(perf.overallRating) }} Tier</span>
            </div>
            <p class="tier-description">
              @switch (classifyTierValue(perf.overallRating)) {
                @case ('gold') {
                  Outstanding performance — 4.8+ average rating
                }
                @case ('silver') {
                  Great performance — 4.5 to 4.79 average rating
                }
                @case ('bronze') {
                  Keep improving — below 4.5 average rating
                }
              }
            </p>
          </section>

          <!-- Recent Reviews -->
          <section class="reviews-section" aria-label="Recent reviews">
            <h2 class="section-title">Recent Reviews</h2>

            @if (perf.recentReviews.length === 0) {
              <div class="empty-state">
                <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                <p class="empty-message">No ratings received yet</p>
              </div>
            } @else {
              <ul class="reviews-list">
                @for (review of perf.recentReviews; track review.createdAt) {
                  <li class="review-item">
                    <div class="review-header">
                      <div class="stars" [attr.aria-label]="review.rating + ' out of 5 stars'">
                        @for (star of starsArray; track star) {
                          <svg
                            class="star"
                            [class.filled]="star <= review.rating"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        }
                      </div>
                      <span class="review-time">{{ review.createdAt | relativeTime }}</span>
                    </div>
                    @if (review.reviewText) {
                      <p class="review-text">{{ truncateText(review.reviewText) }}</p>
                    }
                  </li>
                }
              </ul>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .performance-page {
      padding: 16px;
      max-width: 428px;
      margin: 0 auto;
    }

    .page-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 20px;
    }

    /* Skeleton loading */
    .skeleton-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Metrics section */
    .metrics-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: #1e293b;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .rating-card .rating-display {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .rating-value {
      font-size: 28px;
      font-weight: 700;
      color: #ffffff;
    }

    .star-icon {
      width: 24px;
      height: 24px;
      color: #fbbf24;
    }

    .metric-value {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }

    .metric-label {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Tier section */
    .tier-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      padding: 16px;
      background: #1e293b;
      border-radius: 12px;
    }

    .tier-badge {
      padding: 8px 20px;
      border-radius: 20px;
      border: 2px solid;
      font-weight: 700;
    }

    .tier-label {
      font-size: 14px;
      color: #0f172a;
      font-weight: 700;
    }

    .tier-description {
      font-size: 12px;
      color: #94a3b8;
      margin: 0;
      text-align: center;
    }

    /* Reviews section */
    .reviews-section {
      margin-top: 4px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 12px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 32px 16px;
      background: #1e293b;
      border-radius: 12px;
    }

    .empty-icon {
      width: 40px;
      height: 40px;
      color: #475569;
    }

    .empty-message {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .reviews-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .review-item {
      background: #1e293b;
      border-radius: 12px;
      padding: 14px 16px;
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .stars {
      display: flex;
      gap: 2px;
    }

    .star {
      width: 16px;
      height: 16px;
      fill: #334155;
      stroke: none;
    }

    .star.filled {
      fill: #fbbf24;
    }

    .review-time {
      font-size: 12px;
      color: #64748b;
    }

    .review-text {
      font-size: 14px;
      color: #cbd5e1;
      margin: 0;
      line-height: 1.5;
    }
  `],
})
export class PerformanceComponent implements OnInit {
  readonly performance$ = this.store.select(selectPerformance);
  readonly loading$ = this.store.select(selectPerformanceLoading);
  readonly error$ = this.store.select(selectPerformanceError);

  /** Array [1, 2, 3, 4, 5] for star display iteration */
  readonly starsArray = [1, 2, 3, 4, 5];

  private readonly MAX_REVIEW_TEXT_LENGTH = 200;

  constructor(private readonly store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(loadPerformance());
  }

  onRetry(): void {
    this.store.dispatch(loadPerformance());
  }

  /**
   * Truncates review text to 200 characters with ellipsis if needed.
   */
  truncateText(text: string): string {
    if (text.length <= this.MAX_REVIEW_TEXT_LENGTH) {
      return text;
    }
    return text.substring(0, this.MAX_REVIEW_TEXT_LENGTH) + '…';
  }

  /**
   * Returns the display name for the worker's tier based on their rating.
   */
  getTierName(rating: number): string {
    const tier = classifyTier(rating);
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }

  /**
   * Returns the background colour for the tier badge.
   */
  getTierBgColor(rating: number): string {
    return getTierColor(classifyTier(rating));
  }

  /**
   * Returns a slightly darker border colour for the tier badge.
   */
  getTierBorderColor(rating: number): string {
    const tier = classifyTier(rating);
    switch (tier) {
      case 'gold':
        return '#B8860B';
      case 'silver':
        return '#A0A0A0';
      case 'bronze':
        return '#8B4513';
    }
  }

  /**
   * Returns the tier classification for template switch statements.
   */
  classifyTierValue(rating: number): PerformanceTier {
    return classifyTier(rating);
  }
}
