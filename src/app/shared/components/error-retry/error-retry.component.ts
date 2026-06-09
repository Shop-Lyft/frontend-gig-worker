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
  template: `
    <div class="error-retry" role="alert">
      <div class="error-content">
        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p class="error-message">{{ message }}</p>
      </div>

      <button
        class="retry-btn"
        [disabled]="retrying || isCoolingDown"
        (click)="onRetry()"
        [attr.aria-label]="isCoolingDown ? 'Retry disabled, please wait' : 'Retry'"
      >
        @if (retrying) {
          <span class="spinner" aria-hidden="true"></span>
          Retrying...
        } @else if (isCoolingDown) {
          Wait {{ cooldownRemaining }}s
        } @else {
          Retry
        }
      </button>
    </div>
  `,
  styles: [`
    .error-retry {
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

    .retry-btn {
      min-width: 120px;
      min-height: 44px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      background: #10b981;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.2s ease, background 0.2s ease;
    }

    .retry-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #475569;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
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
