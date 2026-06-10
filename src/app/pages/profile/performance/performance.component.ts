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
  templateUrl: './performance.component.html',
  styleUrl: './performance.component.scss',
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
