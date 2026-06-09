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
import { loadActiveJob } from '../../store/active-job/active-job.actions';
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
 *
 * Requirements: 7.1, 9.1
 */
@Component({
  selector: 'app-active-job',
  standalone: true,
  imports: [CommonModule, RouterLink, PicklistComponent, DeliveryComponent],
  template: `
    <!-- Loading state -->
    @if (loading$ | async) {
      <div class="loading-state" role="status" aria-label="Loading active job">
        <span class="spinner"></span>
        <p class="loading-text">Loading active job...</p>
      </div>
    } @else {
      @if (activeJob$ | async; as activeJob) {
        <!-- Shopper mode: render Picklist -->
        @if ((jobType$ | async) === 'shopper') {
          <app-picklist />
        }

        <!-- Driver mode: render Delivery -->
        @if ((jobType$ | async) === 'driver') {
          <app-delivery [job]="activeJob" />
        }
      } @else {
        <!-- No active job empty state -->
        <div class="empty-state" role="status" aria-label="No active job">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h2 class="empty-title">No active job</h2>
          <p class="empty-description">You don't have an active job right now. Head to the jobs list to find and accept one.</p>
          <a routerLink="/jobs" class="back-link" aria-label="Go to available jobs">
            Browse Available Jobs
          </a>
        </div>
      }
    }
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      color: #94a3b8;
    }

    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(148, 163, 184, 0.3);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
    }

    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 20px;
      color: #475569;
    }

    .empty-icon svg {
      width: 100%;
      height: 100%;
    }

    .empty-title {
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px;
    }

    .empty-description {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 24px;
      max-width: 280px;
      line-height: 1.5;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 12px 24px;
      background: #10b981;
      color: #ffffff;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.2s ease;
    }

    .back-link:hover {
      background: #059669;
    }
  `],
})
export class ActiveJobComponent implements OnInit {
  private store = inject(Store);

  activeJob$ = this.store.select(selectActiveJob);
  jobType$ = this.store.select(selectActiveJobType);
  loading$ = this.store.select(selectActiveJobLoading);

  ngOnInit(): void {
    this.store.dispatch(loadActiveJob());
  }
}
