import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Job } from '../../../core/models/job.model';
import { ZarCurrencyPipe } from '../../pipes/currency.pipe';
import { DistancePipe } from '../../pipes/distance.pipe';

/**
 * JobCardComponent — displays a job summary card in the available jobs list.
 *
 * Features:
 * - Job type icon (shopping bag for Shopper, vehicle for Driver)
 * - Store name, distance (km), item count, estimated pay (R prefix)
 * - Accept button with loading & disabled states
 * - 44px minimum touch targets
 * - Dark card theme (#1e293b)
 */
@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [CommonModule, ZarCurrencyPipe, DistancePipe],
  template: `
    <article class="job-card" [attr.aria-label]="'Job at ' + job.storeName">
      <div class="card-content">
        <div class="card-icon" [attr.aria-label]="job.jobType === 'shopper' ? 'Shopper job' : 'Driver job'">
          @if (job.jobType === 'shopper') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <rect x="1" y="3" width="15" height="13"/>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/>
              <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          }
        </div>

        <div class="card-details">
          <h3 class="store-name">{{ job.storeName }}</h3>
          <div class="meta-row">
            <span class="meta-item">{{ job.distance | distance }}</span>
            <span class="meta-separator">•</span>
            <span class="meta-item">{{ job.itemCount }} {{ job.itemCount === 1 ? 'item' : 'items' }}</span>
          </div>
          <div class="pay">{{ job.estimatedPay | zarCurrency }}</div>
        </div>

        <div class="card-action">
          <button
            class="accept-btn"
            [disabled]="disabled || acceptLoading"
            [class.loading]="acceptLoading"
            (click)="onAccept()"
            aria-label="Accept job"
          >
            @if (acceptLoading) {
              <span class="spinner" aria-hidden="true"></span>
              <span class="sr-only">Accepting...</span>
            } @else {
              Accept
            }
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .job-card {
      background: #1e293b;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .card-content {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .card-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 10px;
      color: #10b981;
    }

    .card-icon svg {
      width: 22px;
      height: 22px;
    }

    .card-details {
      flex: 1;
      min-width: 0;
    }

    .store-name {
      font-size: 15px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .meta-separator {
      font-size: 8px;
    }

    .pay {
      font-size: 16px;
      font-weight: 700;
      color: #10b981;
    }

    .card-action {
      flex-shrink: 0;
    }

    .accept-btn {
      min-width: 72px;
      min-height: 44px;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: #10b981;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.2s ease, background 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .accept-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #94a3b8;
    }

    .accept-btn.loading {
      background: #10b981;
      opacity: 0.7;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `]
})
export class JobCardComponent {
  /** The job data to display */
  @Input({ required: true }) job!: Job;

  /** Whether the Accept button shows a loading state */
  @Input() acceptLoading = false;

  /** Whether the Accept button is disabled (e.g. another accept in progress) */
  @Input() disabled = false;

  /** Emits the job ID when the Accept button is clicked */
  @Output() accept = new EventEmitter<string>();

  onAccept(): void {
    if (!this.disabled && !this.acceptLoading) {
      this.accept.emit(this.job.id);
    }
  }
}
