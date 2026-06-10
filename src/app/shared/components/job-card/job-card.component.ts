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
  templateUrl: './job-card.component.html',
  styleUrl: './job-card.component.scss'
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
