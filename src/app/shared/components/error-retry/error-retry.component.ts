import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * ErrorRetryComponent — inline error message with Retry button.
 *
 * Features:
 * - Displays error message
 * - Retry button with loading state
 * - Cooldown logic: after 3 consecutive failures within 30s, disable retry for 30s
 * - 44px minimum touch targets
 */
@Component({
  selector: 'app-error-retry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-retry.component.html',
  styleUrl: './error-retry.component.scss'
})
export class ErrorRetryComponent implements OnDestroy {
  /** Error message to display */
  @Input() message = 'Something went wrong';

  /** Whether a retry is currently in progress */
  @Input() retrying = false;

  /** Emits when the user clicks the Retry button */
  @Output() retry = new EventEmitter<void>();

  /** Whether the retry button is in cooldown */
  isCoolingDown = false;

  /** Seconds remaining in cooldown */
  cooldownRemaining = 0;

  private failureTimestamps: number[] = [];
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly FAILURE_WINDOW_MS = 30000; // 30 seconds
  private readonly COOLDOWN_DURATION_S = 30; // 30 seconds
  private readonly MAX_FAILURES = 3;

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  onRetry(): void {
    if (this.retrying || this.isCoolingDown) {
      return;
    }

    const now = Date.now();

    // Record failure timestamp
    this.failureTimestamps.push(now);

    // Remove timestamps outside the failure window
    this.failureTimestamps = this.failureTimestamps.filter(
      ts => now - ts < this.FAILURE_WINDOW_MS
    );

    // If 3 or more failures within the window, start cooldown
    if (this.failureTimestamps.length >= this.MAX_FAILURES) {
      this.startCooldown();
      return;
    }

    this.retry.emit();
  }

  private startCooldown(): void {
    this.isCoolingDown = true;
    this.cooldownRemaining = this.COOLDOWN_DURATION_S;
    this.failureTimestamps = [];

    this.cooldownTimer = setInterval(() => {
      this.cooldownRemaining--;
      if (this.cooldownRemaining <= 0) {
        this.isCoolingDown = false;
        this.clearCooldownTimer();
      }
    }, 1000);
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer !== null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }
}
