import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Job } from '../../core/models/job.model';
import {
  selectActiveJob,
  selectActiveJobType,
  selectActiveJobLoading,
} from '../../store/active-job/active-job.selectors';
import { loadActiveJob, cancelActiveJob } from '../../store/active-job/active-job.actions';
import { PicklistComponent } from './picklist/picklist.component';
import { DeliveryComponent } from './delivery/delivery.component';

/**
 * ActiveJobComponent — Container that conditionally renders the Picklist (shopper)
 * or Delivery (driver) component based on the active job type.
 *
 * Handles:
 * - Dispatching loadActiveJob() on init
 * - Loading state while active job is being fetched
 * - No-active-job empty state with link back to Jobs
 * - Conditional routing to Picklist or Delivery based on job type
 * - Cancel job button for stuck/test jobs
 *
 * Requirements: 7.1, 9.1
 */
@Component({
  selector: 'app-active-job',
  standalone: true,
  imports: [CommonModule, RouterLink, PicklistComponent, DeliveryComponent],
  templateUrl: './active-job.component.html',
  styleUrl: './active-job.component.scss',
})
export class ActiveJobComponent implements OnInit {
  private store = inject(Store);

  activeJob$ = this.store.select(selectActiveJob);
  jobType$ = this.store.select(selectActiveJobType);
  loading$ = this.store.select(selectActiveJobLoading);

  ngOnInit(): void {
    this.store.dispatch(loadActiveJob());
  }

  onCancelJob(jobId: string): void {
    if (confirm('Are you sure you want to cancel this job? This cannot be undone.')) {
      this.store.dispatch(cancelActiveJob({ jobId }));
    }
  }
}
